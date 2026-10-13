import { getDb } from "./db";
import type { MessageDto } from "./hub";

type Row = {
  id: number; conversation_id: string; sender_id: string; sender_name: string; body: string; created_at: number;
  file_id: string | null; file_name: string | null; file_size: number | null; file_mime: string | null;
};

export const RASTER_IMAGES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

const SELECT = `
  SELECT m.id, m.conversation_id, m.sender_id, u.display_name AS sender_name, m.body, m.created_at,
         f.id AS file_id, f.original_name AS file_name, f.size AS file_size, f.mime AS file_mime
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    LEFT JOIN files f ON f.id = m.file_id`;

const toDto = (r: Row): MessageDto => ({
  id: r.id,
  conversationId: r.conversation_id,
  senderId: r.sender_id,
  senderName: r.sender_name,
  body: r.body,
  createdAt: r.created_at,
  file: r.file_id
    ? { id: r.file_id, name: r.file_name!, size: r.file_size!, image: RASTER_IMAGES.has(r.file_mime!) }
    : null,
});

/** Callers MUST have run canAccessConversation first. Returns oldest→newest. */
export function listMessages(conversationId: string, before?: number, limit = 50): MessageDto[] {
  const rows = getDb()
    .prepare(`${SELECT} WHERE m.conversation_id = ? AND m.id < ? ORDER BY m.id DESC LIMIT ?`)
    .all(conversationId, before ?? Number.MAX_SAFE_INTEGER, Math.min(limit, 100)) as Row[];
  return rows.reverse().map(toDto);
}

export function getMessage(id: number | bigint): MessageDto {
  return toDto(getDb().prepare(`${SELECT} WHERE m.id = ?`).get(id) as Row);
}
