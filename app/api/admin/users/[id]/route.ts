import { z } from "zod";
import { getDb, audit } from "@/lib/db";
import { destroyAllSessions } from "@/lib/session";
import { apiUser, clientIp, fail, json } from "@/lib/http";

const Body = z.object({ disabled: z.boolean() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser(req, { write: true });
  if (user instanceof Response) return user;
  if (user.role !== "admin") return fail(403, "Admin only");
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Invalid request");

  const res = getDb()
    .prepare("UPDATE users SET disabled = ? WHERE id = ? AND role = 'guest'")
    .run(parsed.data.disabled ? 1 : 0, id);
  if (!res.changes) return fail(404, "Not found");
  if (parsed.data.disabled) destroyAllSessions(id);
  audit(parsed.data.disabled ? "user_disabled" : "user_enabled", { userId: user.id, detail: id, ip: clientIp(req) });
  return json({ ok: true });
}
