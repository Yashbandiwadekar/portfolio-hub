"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode, code = "" }: { mode: "login" | "join"; code?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const payload =
      mode === "login"
        ? { username: f.get("username"), password: f.get("password") }
        : { code: f.get("code"), username: f.get("username"), displayName: f.get("displayName"), password: f.get("password") };
    const res = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    if (res?.ok) {
      router.replace("/chat");
      router.refresh();
      return;
    }
    setError((await res?.json().catch(() => null))?.error ?? "Network error, try again");
    setBusy(false);
  }

  return (
    <form onSubmit={submit}>
      {mode === "join" && (
        <>
          <label htmlFor="code">Invite code</label>
          <input id="code" name="code" type="text" defaultValue={code} required autoComplete="off" />
          <label htmlFor="displayName">Your name (what I&apos;ll see)</label>
          <input id="displayName" name="displayName" type="text" required maxLength={40} autoComplete="name" />
        </>
      )}
      <label htmlFor="username">Username</label>
      <input id="username" name="username" type="text" required autoComplete="username" autoCapitalize="none" />
      <label htmlFor="password">Password{mode === "join" ? " (10+ characters)" : ""}</label>
      <input
        id="password"
        name="password"
        type="password"
        required
        minLength={mode === "join" ? 10 : undefined}
        autoComplete={mode === "join" ? "new-password" : "current-password"}
      />
      <div className="err" role="alert">{error}</div>
      <button className="btn primary" disabled={busy}>
        {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
