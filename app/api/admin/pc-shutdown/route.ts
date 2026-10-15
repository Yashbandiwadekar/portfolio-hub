import { audit } from "@/lib/db";
import { apiUser, clientIp, fail, json } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";
import { shutdownPc } from "@/lib/pcshutdown";

export async function POST(req: Request) {
  const user = await apiUser(req, { write: true });
  if (user instanceof Response) return user;
  if (user.role !== "admin") return fail(403, "Admin only");
  if (!rateLimit(`pcshutdown:${user.id}`, 3, 60_000)) return fail(429, "Wait a minute before trying again");

  try {
    await shutdownPc();
    audit("pc_shutdown", { userId: user.id, ip: clientIp(req) });
    return json({ ok: true });
  } catch (e) {
    audit("pc_shutdown_failed", { userId: user.id, detail: (e as Error).message.slice(0, 100), ip: clientIp(req) });
    return fail(502, "Couldn't reach the PC to shut it down");
  }
}
