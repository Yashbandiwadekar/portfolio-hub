import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getUser } from "@/lib/dal";

export const metadata = { title: "Join — Yash Bandiwadekar", robots: { index: false } };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  if (await getUser()) redirect("/chat");
  const { code } = await searchParams;
  return (
    <main className="auth">
      <div className="card">
        <h1>Create your account</h1>
        <p>You need the invite code I sent you. It works once.</p>
        <AuthForm mode="join" code={typeof code === "string" ? code : ""} />
      </div>
      <p style={{ textAlign: "center", marginTop: 16 }}>
        <Link href="/login">Already have an account? Sign in</Link>
      </p>
    </main>
  );
}
