"use client";

import { useEffect, useRef, useState } from "react";
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

export function WakeButton({ mac }: { mac: string }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [pc, setPc] = useState<{ up: boolean; host: string } | null>(null);
  const fastUntil = useRef(0);

  // Poll whether the PC is on: every 15 s, or every 5 s for 2 minutes after a wake.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      const res = await fetch("/api/admin/pc-status").catch(() => null);
      if (res?.ok && !stopped) setPc(await res.json());
      if (!stopped) timer = setTimeout(tick, Date.now() < fastUntil.current ? 5000 : 15000);
    };
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="row" style={{ flexWrap: "wrap" }}>
      <span className="chip" role="status" aria-live="polite">
        <span className={`status ${pc?.up ? "on" : ""}`} aria-hidden />
        PC {pc ? (pc.up ? "is on" : "is off") : "checking…"}
        {pc ? ` · ${pc.host}` : ""}
      </span>
      <button
        className="btn primary"
        disabled={busy || !!pc?.up}
        title={pc?.up ? "The PC is already on" : undefined}
        onClick={async () => {
          setBusy(true);
          setStatus("");
          const res = await fetch("/api/admin/wol", { method: "POST" }).catch(() => null);
          const data = await res?.json().catch(() => null);
          if (res?.ok) fastUntil.current = Date.now() + 120_000;
          setStatus(res?.ok ? `Magic packet sent to ${mac}. Watching for it to come up…` : data?.error ?? "Network error");
          setBusy(false);
        }}
      >
        {busy ? "Sending…" : "Wake PC"}
      </button>
      {status && <span className="meta">{status}</span>}
    </div>
  );
}
