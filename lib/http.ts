import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "./config";
import { userFromToken, type SessionUser } from "./session";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

/** CSRF defence in depth (cookie is also SameSite=Lax): Origin host must equal Host. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function apiUser(req: Request, opts: { write?: boolean } = {}): Promise<SessionUser | Response> {
  if (opts.write && !sameOrigin(req)) return fail(403, "Bad origin");
  const user = userFromToken((await cookies()).get(COOKIE_NAME)?.value);
  return user ?? fail(401, "Not signed in");
}
