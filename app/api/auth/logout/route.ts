import { cookies } from "next/headers";
import { destroySession } from "@/lib/session";
import { COOKIE_NAME } from "@/lib/config";
import { fail, json, sameOrigin } from "@/lib/http";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Bad origin");
  const jar = await cookies();
  destroySession(jar.get(COOKIE_NAME)?.value);
  jar.delete(COOKIE_NAME);
  return json({ ok: true });
}
