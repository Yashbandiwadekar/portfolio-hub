import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { COOKIE_NAME } from "./config";
import { userFromToken, type SessionUser } from "./session";

export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return userFromToken(token);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/chat");
  return user;
}

/**
 * THE authorization check for conversation data (messages, files).
 * Admin can see every conversation; a guest only their own. Every query that
 * touches a conversation must pass through this — don't rely on UI or routing.
 */
export function canAccessConversation(user: SessionUser, conversationId: string): boolean {
  const conv = getDb().prepare("SELECT guest_id FROM conversations WHERE id = ?").get(conversationId) as
    | { guest_id: string }
    | undefined;
  if (!conv) return false;
  return user.role === "admin" || conv.guest_id === user.id;
}
