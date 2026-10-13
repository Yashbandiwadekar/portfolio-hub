import crypto from "node:crypto";
import { cookies } from "next/headers";
import { hash } from "@node-rs/argon2";
import { z } from "zod";
import { getDb, audit } from "@/lib/db";
import { createSession, hashInviteCode } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp, fail, json, sameOrigin } from "@/lib/http";
import { COOKIE_NAME, COOKIE_SECURE, SESSION_TTL_MS } from "@/lib/config";

const Body = z.object({
  code: z.string().min(10).max(100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.-]{3,24}$/, "Username: 3-24 chars, a-z 0-9 _ . -"),
  displayName: z.string().trim().min(1).max(40),
  password: z.string().min(10, "Password must be at least 10 characters").max(200),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Bad origin");
  const ip = clientIp(req);
  if (!rateLimit(`register:${ip}`, 10, 60 * 60_000)) return fail(429, "Too many attempts");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");
  const { code, username, displayName, password } = parsed.data;

  const passwordHash = await hash(password);
  const db = getDb();
  const userId = crypto.randomUUID();

  const result = db.transaction((): string | null => {
    const invite = db
      .prepare("SELECT id FROM invites WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?")
      .get(hashInviteCode(code.trim()), Date.now()) as { id: string } | undefined;
    if (!invite) return "Invite code is invalid, used, or expired";
    if (db.prepare("SELECT 1 FROM users WHERE username = ?").get(username)) return "That username is taken";

    const now = Date.now();
    db.prepare(
      "INSERT INTO users (id, username, display_name, password_hash, role, created_at) VALUES (?,?,?,?, 'guest', ?)",
    ).run(userId, username, displayName, passwordHash, now);
    db.prepare("INSERT INTO conversations (id, guest_id, created_at) VALUES (?,?,?)").run(
      crypto.randomUUID(),
      userId,
      now,
    );
    db.prepare("UPDATE invites SET used_by = ?, used_at = ? WHERE id = ?").run(userId, now, invite.id);
    return null;
  })();

  if (result) {
    audit("register_failed", { detail: result, ip });
    return fail(400, result);
  }

  const { token } = createSession(userId, ip, req.headers.get("user-agent") ?? undefined);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  audit("register_ok", { userId, detail: username, ip });
  return json({ ok: true });
}
