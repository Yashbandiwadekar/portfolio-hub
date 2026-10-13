import path from "node:path";

// Private data (SQLite + uploads) lives OUTSIDE the repo and outside /public.
export const DATA_DIR = path.resolve(
  process.env.DATA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "..", "portfolio-hub-data"),
);
export const UPLOAD_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, "uploads");

// Cloudflare's free plan rejects request bodies over 100 MB at the edge.
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const USER_QUOTA_BYTES = 500 * 1024 * 1024;
export const MAX_MESSAGE_CHARS = 4000;

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const secure = (process.env.COOKIE_SECURE ?? String(process.env.NODE_ENV === "production")) === "true";
export const COOKIE_SECURE = secure;
// __Host- prefix: browser enforces Secure + Path=/ + no Domain attribute.
export const COOKIE_NAME = secure ? "__Host-session" : "session";
