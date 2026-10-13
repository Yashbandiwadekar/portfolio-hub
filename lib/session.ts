import crypto from "node:crypto";
import { getDb } from "./db";
import { SESSION_TTL_MS } from "./config";

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "guest";
};

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/** The raw token only ever lives in the cookie; the DB stores its hash. */
export function createSession(userId: string, ip?: string, ua?: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  getDb()
    .prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at, ip, user_agent) VALUES (?,?,?,?,?,?)")
    .run(sha256(token), userId, now, now + SESSION_TTL_MS, ip ?? null, ua?.slice(0, 200) ?? null);
  return { token, expiresAt: now + SESSION_TTL_MS };
}

export function userFromToken(token: string | undefined): SessionUser | null {
  if (!token || token.length > 100) return null;
  const row = getDb()
    .prepare(
      `SELECT u.id, u.username, u.display_name AS displayName, u.role
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ? AND u.disabled = 0`,
    )
    .get(sha256(token), Date.now()) as SessionUser | undefined;
  return row ?? null;
}

export function destroySession(token: string | undefined) {
  if (token) getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}

export function destroyAllSessions(userId: string) {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export const hashInviteCode = sha256;
