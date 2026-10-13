import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { getDb, audit } from "@/lib/db";
import { canAccessConversation } from "@/lib/dal";
import { apiUser, clientIp, fail } from "@/lib/http";
import { RASTER_IMAGES } from "@/lib/messages";
import { UPLOAD_DIR } from "@/lib/config";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const user = await apiUser(req);
  if (user instanceof Response) return user;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return fail(404, "Not found");

  const f = getDb()
    .prepare("SELECT conversation_id, original_name, size, mime FROM files WHERE id = ?")
    .get(id) as { conversation_id: string; original_name: string; size: number; mime: string } | undefined;
  // Same 404 for "doesn't exist" and "not yours" so ids can't be enumerated.
  if (!f || !canAccessConversation(user, f.conversation_id)) return fail(404, "Not found");

  const inline = new URL(req.url).searchParams.get("inline") === "1" && RASTER_IMAGES.has(f.mime);
  const asciiName = f.original_name.replace(/[^\x20-\x7e]/g, "_");
  audit("download", { userId: user.id, detail: id, ip: clientIp(req) });

  return new Response(Readable.toWeb(fs.createReadStream(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, id))) as ReadableStream, {
    headers: {
      "Content-Type": inline ? f.mime : "application/octet-stream",
      "Content-Length": String(f.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(f.original_name)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
