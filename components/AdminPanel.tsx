"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLink("");
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Failed");
    setLink(`${location.origin}/join?code=${data.code}`);
    setLabel("");
    router.refresh();
  }

  return (
    <>
      <form className="row" onSubmit={create}>
        <input type="text" placeholder="Who is it for? e.g. Mom" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} aria-label="Invite label" />
        <button className="btn primary">Create invite</button>
      </form>
      <div className="err" role="alert">{error}</div>
      {link && (
        <div style={{ marginTop: 10 }}>
          <div className="meta" style={{ fontSize: 13, color: "var(--muted)" }}>Single-use, expires in 7 days. Shown once, so copy it now:</div>
          <div className="code">{link}</div>
          <button className="btn" style={{ marginTop: 8 }} onClick={() => navigator.clipboard.writeText(link)}>Copy link</button>
        </div>
      )}
    </>
  );
}

export function DisableToggle({ id, disabled }: { id: string; disabled: boolean }) {
  const router = useRouter();
  return (
    <button
      className={`btn ${disabled ? "" : "danger"}`}
      onClick={async () => {
        await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disabled: !disabled }),
        });
        router.refresh();
      }}
    >
      {disabled ? "Enable" : "Disable"}
    </button>
  );
}
