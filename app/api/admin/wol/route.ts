import { audit } from "@/lib/db";
import { apiUser, clientIp, fail, json } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";
import { sendWol, WOL_MAC } from "@/lib/wol";

export async function POST(req: Request) {
  const user = await apiUser(req, { write: true });
  if (user instanceof Response) return user;
  if (user.role !== "admin") return fail(403, "Admin only");
  if (!rateLimit(`wol:${user.id}`, 5, 60_000)) return fail(429, "Easy — wait a minute before sending again");

  try {
    const sentTo = await sendWol();
    audit("wol_sent", { userId: user.id, detail: `${WOL_MAC} via ${sentTo.join(", ")}`, ip: clientIp(req) });
    return json({ ok: true, mac: WOL_MAC, sentTo });
  } catch (e) {
    audit("wol_failed", { userId: user.id, detail: (e as Error).message.slice(0, 100), ip: clientIp(req) });
    return fail(500, "Couldn't send the wake packet");
  }
}
