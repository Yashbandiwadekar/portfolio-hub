"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MessageDto } from "@/lib/hub";

function Time({ ts }: { ts: number }) {
  // Server and browser timezones differ; the browser's rendering is the one we want.
  return (
    <time dateTime={new Date(ts).toISOString()} suppressHydrationWarning>
      {new Date(ts).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
    </time>
  );
}

const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

export function Chat({
  conversationId,
  meId,
  initial,
}: {
  conversationId: string;
  meId: string;
  initial: MessageDto[];
}) {
  const [msgs, setMsgs] = useState<MessageDto[]>(initial);
  const [online, setOnline] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const add = useCallback((m: MessageDto) => {
    setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let delay = 1000;
    let closed = false;

    const connect = () => {
      ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
      ws.onopen = () => {
        setOnline(true);
        delay = 1000;
      };
      ws.onmessage = (ev) => {
        const e = JSON.parse(ev.data);
        if (e.type === "message" && e.message.conversationId === conversationId) add(e.message);
      };
      ws.onclose = () => {
        setOnline(false);
        if (!closed) timer = setTimeout(connect, (delay = Math.min(delay * 2, 15000)));
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, [conversationId, add]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (sending || (!text.trim() && !file)) return;
    setSending(true);
    setError("");
    const fd = new FormData();
    fd.set("body", text);
    if (file) fd.set("file", file);
    const res = await fetch(`/api/conversations/${conversationId}/messages`, { method: "POST", body: fd }).catch(() => null);
    if (res?.ok) {
      add((await res.json()).message);
      setText("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } else {
      setError((await res?.json().catch(() => null))?.error ?? "Couldn't send. Check your connection.");
    }
    setSending(false);
  }

  return (
    <>
      <div className="msgs" role="log" aria-live="polite">
        {msgs.length === 0 && <div className="empty">No messages yet. Say hi 👋</div>}
        {msgs.map((m) => (
          <div key={m.id} className={`msg ${m.senderId === meId ? "mine" : ""}`}>
            {m.senderId !== meId && <div className="who">{m.senderName}</div>}
            {m.body && <div className="body">{m.body}</div>}
            {m.file?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/${m.file.id}?inline=1`} alt={m.file.name} loading="lazy" />
            )}
            {m.file && (
              <div className="file">
                <span>📎</span>
                <a href={`/api/files/${m.file.id}`} download>{m.file.name}</a>
                <span>({fmtSize(m.file.size)})</span>
              </div>
            )}
            <div className="time"><Time ts={m.createdAt} /></div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {file && (
        <div className="picked">
          📎 {file.name} ({fmtSize(file.size)})
          <button type="button" className="btn" onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ""; }}>
            Remove
          </button>
        </div>
      )}
      {error && <div className="err" style={{ padding: "0 16px" }} role="alert">{error}</div>}

      <form className="composer" onSubmit={send}>
        <input ref={fileInput} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="button" className="btn" onClick={() => fileInput.current?.click()} aria-label="Attach a file">📎</button>
        <textarea
          rows={1}
          value={text}
          maxLength={4000}
          placeholder="Write a message…"
          aria-label="Message"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
        />
        <button className="btn primary" disabled={sending}>{sending ? "…" : "Send"}</button>
      </form>
      <div className="picked" style={{ paddingTop: 0 }}>
        <span className={`status ${online ? "on" : ""}`} />
        {online ? "Live" : "Reconnecting…"} · files up to 50 MB
      </div>
    </>
  );
}
