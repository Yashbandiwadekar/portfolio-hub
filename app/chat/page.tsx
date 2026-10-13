import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/dal";

export const metadata = { title: "Chat — Yash Bandiwadekar", robots: { index: false } };

export default async function ChatIndex() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");
  const conv = getDb().prepare("SELECT id FROM conversations WHERE guest_id = ?").get(user.id) as { id: string };
  redirect(`/chat/${conv.id}`);
}
