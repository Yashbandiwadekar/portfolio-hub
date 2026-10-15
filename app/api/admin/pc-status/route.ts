import { apiUser, fail, json } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";
import { isPcUp, WOL_HOST } from "@/lib/wol";

export async function GET(req: Request) {
  const user = await apiUser(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin") return fail(403, "Admin only");
  if (!rateLimit(`pcstatus:${user.id}`, 30, 60_000)) return fail(429, "Too many checks");
  return json({ up: await isPcUp(), host: WOL_HOST, checkedAt: Date.now() });
}
