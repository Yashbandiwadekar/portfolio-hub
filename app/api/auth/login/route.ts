import { cookies } from "next/headers";
import { verify, hash } from "@node-rs/argon2";
import { z } from "zod";
import { getDb, audit } from "@/lib/db";
import { createSession } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp, fail, json, sameOrigin } from "@/lib/http";
import { COOKIE_NAME, COOKIE_SECURE, SESSION_TTL_MS } from "@/lib/config";

const Body = z.object({ username: z.string().min(1).max(40), password: z.string().min(1).max(200) });

let dummyHash: Promise<string> | undefined;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Bad origin");
  const ip = clientIp(req);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Invalid request");
  const username = parsed.data.username.trim().toLowerCase();

  if (!rateLimit(`login:ip:${ip}`, 20, 15 * 60_000) || !rateLimit(`login:user:${username}`, 8, 15 * 60_000)) {
    audit("login_throttled", { detail: username, ip });
    return fail(429, "Too many attempts. Try again in a few minutes.");
  }

  const user = getDb()
    .prepare("SELECT id, password_hash, disabled FROM users WHERE username = ?")
    .get(username) as { id: string; password_hash: string; disabled: number } | undefined;

  // Verify against a dummy hash when the user doesn't exist so timing doesn't reveal usernames.
  const ok = await verify(
    user?.password_hash ?? (await (dummyHash ??= hash("not-a-real-password"))),
    parsed.data.password,
  );
  if (!user || !ok || user.disabled) {
    audit("login_failed", { detail: username, ip });
    return fail(401, "Wrong username or password");
  }

  const { token } = createSession(user.id, ip, req.headers.get("user-agent") ?? undefined);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  audit("login_ok", { userId: user.id, ip });
  return json({ ok: true });
}
