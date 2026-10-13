import Link from "next/link";
import { notFound } from "next/navigation";
import { Chat } from "@/components/Chat";
import { LogoutButton } from "@/components/LogoutButton";
import { getDb } from "@/lib/db";
import { canAccessConversation, requireUser } from "@/lib/dal";
import { listMessages } from "@/lib/messages";

export const metadata = { title: "Chat — Yash Bandiwadekar", robots: { index: false } };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!canAccessConversation(user, id)) notFound();

  const guest = getDb()
    .prepare("SELECT u.display_name AS name FROM conversations c JOIN users u ON u.id = c.guest_id WHERE c.id = ?")
    .get(id) as { name: string };
  const admin = user.role === "admin";

  return (
    <div className="chat-shell">
      <header className="chat-head">
        <div>
          <h1>{admin ? guest.name : "Chat with Yash"}</h1>
          <div className="sub">{admin ? "Private conversation" : "Only you and Yash can see this"}</div>
        </div>
        <div className="row">
          {admin ? <Link className="btn" href="/admin">← All guests</Link> : <Link className="btn" href="/">Portfolio</Link>}
          <LogoutButton />
        </div>
      </header>
      <Chat conversationId={id} meId={user.id} initial={listMessages(id)} />
    </div>
  );
}
