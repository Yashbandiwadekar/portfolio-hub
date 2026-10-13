import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getUser } from "@/lib/dal";

export const metadata = { title: "Sign in — Yash Bandiwadekar" };

export default async function LoginPage() {
  if (await getUser()) redirect("/chat");
  return (
    <main className="auth">
      <div className="card">
        <h1>Sign in</h1>
        <p>Private chat and file drop for friends and family. Accounts are invite-only.</p>
        <AuthForm mode="login" />
      </div>
      <p style={{ textAlign: "center", marginTop: 16 }}>
        <Link href="/">← Back to portfolio</Link>
      </p>
    </main>
  );
}
