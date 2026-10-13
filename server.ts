// Custom server: Next.js + a WebSocket endpoint (/ws) on one port.
// Binds to 127.0.0.1 so the only way in from the internet is the Cloudflare Tunnel.
import { createServer } from "node:http";
import { loadEnvConfig } from "@next/env";

const dev = process.argv.includes("--dev");
(process.env as Record<string, string>).NODE_ENV = dev ? "development" : "production";
loadEnvConfig(process.cwd(), dev);

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 3000);

async function main() {
  const [{ default: next }, { WebSocketServer }, { subscribe }, { userFromToken }, { COOKIE_NAME }] = await Promise.all([
    import("next"),
    import("ws"),
    import("./lib/hub"),
    import("./lib/session"),
    import("./lib/config"),
  ]);
  const { getDb } = await import("./lib/db");
  const { rateLimit } = await import("./lib/ratelimit");

  getDb(); // open + migrate on boot
  const app = next({ dev, hostname: HOST, port: PORT });
  const handle = app.getRequestHandler();
  await app.prepare();
  const upgrade = app.getUpgradeHandler();

  const server = createServer((req, res) => {
    handle(req, res);
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname !== "/ws") {
      // Let Next handle its own upgrades (HMR in dev).
      if (dev) return void upgrade(req, socket, head);
      return socket.destroy();
    }

    // Cross-site WebSocket hijacking guard: Origin host must match Host.
    let originOk = false;
    try {
      originOk = !!req.headers.origin && new URL(req.headers.origin).host === req.headers.host;
    } catch {}
    const cookie = req.headers.cookie ?? "";
    const token = cookie
      .split(";")
      .map((c) => c.trim().split("="))
      .find(([k]) => k === COOKIE_NAME)?.[1];
    const ip = String(req.headers["cf-connecting-ip"] ?? req.socket.remoteAddress);
    const user = originOk ? userFromToken(token) : null;

    if (!user || !rateLimit(`ws:${ip}`, 30, 60_000)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      return socket.destroy();
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      // Admin listens to every conversation; a guest to their own only.
      let key = "*";
      if (user.role === "guest") {
        const conv = getDb().prepare("SELECT id FROM conversations WHERE guest_id = ?").get(user.id) as
          | { id: string }
          | undefined;
        if (!conv) return ws.close();
        key = conv.id;
      }
      const unsub = subscribe(key, (e) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(e)));
      // Re-validate the session periodically so logout / disabling kicks live sockets.
      const check = setInterval(() => {
        if (!userFromToken(token)) ws.close(4401, "session ended");
      }, 30_000);
      ws.on("close", () => {
        unsub();
        clearInterval(check);
      });
      ws.on("error", () => ws.close());
    });
  });

  server.listen(PORT, HOST, () => {
    console.log(`> portfolio-hub on http://${HOST}:${PORT} (${dev ? "dev" : "production"})`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
