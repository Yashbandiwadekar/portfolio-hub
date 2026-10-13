import crypto from "node:crypto";
import { z } from "zod";
import { getDb, audit } from "@/lib/db";
import { hashInviteCode } from "@/lib/session";
import { apiUser, clientIp, fail, json } from "@/lib/http";
import { INVITE_TTL_MS } from "@/lib/config";

const Body = z.object({ label: z.string().trim().min(1).max(60) });

export async function POST(req: Request) {
  const user = await apiUser(req, { write: true });
  if (user instanceof Response) return user;
  if (user.role !== "admin") return fail(403, "Admin only");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Give the invite a label (who is it for?)");

  // 128 bits, shown once; only its hash is stored.
  const code = crypto.randomBytes(16).toString("base64url");
  const now = Date.now();
  getDb()
    .prepare("INSERT INTO invites (id, code_hash, label, created_by, created_at, expires_at) VALUES (?,?,?,?,?,?)")
    .run(crypto.randomUUID(), hashInviteCode(code), parsed.data.label, user.id, now, now + INVITE_TTL_MS);
  audit("invite_created", { userId: user.id, detail: parsed.data.label, ip: clientIp(req) });
  return json({ code }, 201);
}
