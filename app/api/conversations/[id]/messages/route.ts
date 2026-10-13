import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getDb, audit } from "@/lib/db";
import { canAccessConversation } from "@/lib/dal";
import { apiUser, clientIp, fail, json } from "@/lib/http";
import { getMessage, listMessages } from "@/lib/messages";
import { publish } from "@/lib/hub";
import { rateLimit } from "@/lib/ratelimit";
import { UPLOAD_DIR, MAX_FILE_BYTES, MAX_MESSAGE_CHARS, USER_QUOTA_BYTES } from "@/lib/config";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const user = await apiUser(req);
  if (user instanceof Response) return user;
  const { id } = await params;
  // 404 (not 403) so a guest can't probe which conversation ids exist.
  if (!canAccessConversation(user, id)) return fail(404, "Not found");
  const before = Number(new URL(req.url).searchParams.get("before")) || undefined;
  return json({ messages: listMessages(id, before) });
}

/** Detect raster images by magic bytes; never trust the client-declared MIME type. */
function sniffMime(b: Buffer): string {
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 6 && b.subarray(0, 4).toString("latin1") === "GIF8") return "image/gif";
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP")
    return "image/webp";
  return "application/octet-stream";
}

const cleanName = (n: string) =>
  n.replace(/[\\/]/g, "_").replace(/[\x00-\x1f\x7f"]/g, "").trim().slice(0, 150) || "file";

export async function POST(req: Request, { params }: Ctx) {
  const user = await apiUser(req, { write: true });
  if (user instanceof Response) return user;
  const { id } = await params;
  if (!canAccessConversation(user, id)) return fail(404, "Not found");
  if (!rateLimit(`msg:${user.id}`, 60, 60_000)) return fail(429, "Slow down a little");

  const ctype = req.headers.get("content-type") ?? "";
  if (!ctype.startsWith("multipart/form-data")) return fail(415, "Expected multipart/form-data");
  const limit = MAX_FILE_BYTES + 1024 * 1024;
  const len = Number(req.headers.get("content-length"));
  if (len > limit) return fail(413, `Files are limited to ${MAX_FILE_BYTES / 1048576} MB`);

  // A proxy may drop Content-Length (chunked transfer); then enforce the cap while streaming.
  let tooBig = false;
  let source: Request | Response = req;
  if (!len) {
    if (!req.body) return fail(400, "Empty request");
    let seen = 0;
    const capped = req.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, ctl) {
          seen += chunk.byteLength;
          if (seen > limit) {
            tooBig = true;
            ctl.error(new Error("too large"));
          } else ctl.enqueue(chunk);
        },
      }),
    );
    source = new Response(capped, { headers: { "content-type": ctype } });
  }

  const form = await source.formData().catch(() => null);
  if (tooBig) return fail(413, `Files are limited to ${MAX_FILE_BYTES / 1048576} MB`);
  if (!form) return fail(400, "Bad form data");
  const body = String(form.get("body") ?? "").trim();
  const file = form.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (!body && !hasFile) return fail(400, "Empty message");
  if (body.length > MAX_MESSAGE_CHARS) return fail(400, "Message too long");

  const db = getDb();
  let fileId: string | null = null;

  if (hasFile) {
    if (file.size > MAX_FILE_BYTES) return fail(413, `Files are limited to ${MAX_FILE_BYTES / 1048576} MB`);
    const used = (
      db.prepare("SELECT COALESCE(SUM(size),0) AS n FROM files WHERE uploader_id = ?").get(user.id) as { n: number }
    ).n;
    if (used + file.size > USER_QUOTA_BYTES) return fail(413, "Storage quota reached");

    const buf = Buffer.from(await file.arrayBuffer());
    fileId = crypto.randomUUID();
    // UUID only: user-supplied names never touch the filesystem.
    await fs.writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, fileId), buf, { flag: "wx" });
    db.prepare(
      "INSERT INTO files (id, conversation_id, uploader_id, original_name, size, mime, created_at) VALUES (?,?,?,?,?,?,?)",
    ).run(fileId, id, user.id, cleanName(file.name), buf.length, sniffMime(buf), Date.now());
    audit("upload", { userId: user.id, detail: `${fileId} ${buf.length}B conv=${id}`, ip: clientIp(req) });
  }

  const info = db
    .prepare("INSERT INTO messages (conversation_id, sender_id, body, file_id, created_at) VALUES (?,?,?,?,?)")
    .run(id, user.id, body, fileId, Date.now());
  const message = getMessage(info.lastInsertRowid);
  publish(id, { type: "message", message });
  return json({ message }, 201);
}
