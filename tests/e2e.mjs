// End-to-end security/behaviour test against a RUNNING dev/prod server (use a throwaway DATA_DIR!).
//   ADMIN_USER=yash ADMIN_PASS=... BASE=http://localhost:3000 node tests/e2e.mjs
import WebSocket from "ws";

const BASE = process.env.BASE ?? "http://localhost:3000";
const ADMIN_USER = process.env.ADMIN_USER ?? "yash";
const ADMIN_PASS = process.env.ADMIN_PASS;
if (!ADMIN_PASS) throw new Error("ADMIN_PASS required");

let pass = 0, failN = 0;
const check = (name, ok, extra = "") => {
  if (ok) pass++; else failN++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`);
};

class Client {
  cookie = "";
  async req(path, { method = "GET", json, form, origin = BASE, headers = {} } = {}) {
    const h = { ...headers };
    if (this.cookie) h.cookie = this.cookie;
    if (origin) h.origin = origin;
    let body;
    if (json) { h["content-type"] = "application/json"; body = JSON.stringify(json); }
    if (form) body = form;
    const res = await fetch(BASE + path, { method, headers: h, body, redirect: "manual" });
    const sc = res.headers.get("set-cookie");
    if (sc) this.cookie = sc.split(";")[0];
    return res;
  }
}

const rand = () => Math.random().toString(36).slice(2, 8);
const admin = new Client();
let r = await admin.req("/api/auth/login", { method: "POST", json: { username: ADMIN_USER, password: ADMIN_PASS } });
check("admin login", r.status === 200, r.status);

r = await admin.req("/api/auth/login", { method: "POST", json: { username: ADMIN_USER, password: "nope" } , origin: "http://evil.example" });
check("login from foreign Origin rejected (CSRF)", r.status === 403, r.status);

async function makeGuest(label) {
  r = await admin.req("/api/admin/invites", { method: "POST", json: { label } });
  const { code } = await r.json();
  const c = new Client();
  const username = `g${label}${rand()}`.toLowerCase();
  r = await c.req("/api/auth/register", { method: "POST", json: { code, username, displayName: label, password: "correct-horse-battery" } });
  check(`register guest ${label}`, r.status === 200, await r.text());
  const again = new Client();
  r = await again.req("/api/auth/register", { method: "POST", json: { code, username: username + "x", displayName: "x", password: "correct-horse-battery" } });
  check(`invite code is single-use (${label})`, r.status === 400, r.status);
  return { c, username, code };
}

const A = await makeGuest("alice");
const B = await makeGuest("bob");

// Conversation ids come from the server-rendered redirect.
async function convId(client) {
  const res = await client.req("/chat");
  const loc = res.headers.get("location") ?? "";
  return loc.split("/").pop();
}
const convA = await convId(A.c), convB = await convId(B.c);
check("guests got distinct conversations", convA && convB && convA !== convB);

// WebSocket: admin hears everything, bob must not hear alice.
const open = (client) => new Promise((res, rej) => {
  const ws = new WebSocket(BASE.replace("http", "ws") + "/ws", { headers: { cookie: client.cookie, origin: BASE } });
  const got = [];
  ws.on("message", (d) => got.push(JSON.parse(d)));
  ws.on("open", () => res({ ws, got }));
  ws.on("unexpected-response", (_q, resp) => rej(new Error("ws " + resp.statusCode)));
  ws.on("error", rej);
});
const wsAdmin = await open(admin), wsBob = await open(B.c);

// Foreign-origin WS must be refused.
await new Promise((res) => {
  const ws = new WebSocket(BASE.replace("http", "ws") + "/ws", { headers: { cookie: A.c.cookie, origin: "http://evil.example" } });
  ws.on("open", () => { check("WS with foreign Origin refused", false); ws.close(); res(); });
  ws.on("unexpected-response", () => { check("WS with foreign Origin refused", true); res(); });
  ws.on("error", () => { check("WS with foreign Origin refused", true); res(); });
});
const anon = await new Promise((res) => {
  const ws = new WebSocket(BASE.replace("http", "ws") + "/ws", { headers: { origin: BASE } });
  ws.on("open", () => res(false));
  ws.on("unexpected-response", () => res(true));
  ws.on("error", () => res(true));
});
check("WS without session refused", anon);

// Alice sends text + a file.
const fd = new FormData();
fd.set("body", "hello yash");
fd.set("file", new File([Buffer.from("secret contents of alice")], "../../evil/name.txt", { type: "text/html" }));
r = await A.c.req(`/api/conversations/${convA}/messages`, { method: "POST", form: fd });
const sent = await r.json();
check("alice sends message with file", r.status === 201 && sent.message?.file, JSON.stringify(sent));
const fileId = sent.message?.file?.id;
check("path traversal in filename neutralised", sent.message?.file?.name === ".._.._evil_name.txt", sent.message?.file?.name);

await new Promise((res) => setTimeout(res, 300));
check("admin received live message", wsAdmin.got.some((e) => e.message?.body === "hello yash"));
check("bob did NOT receive alice's live message", !wsBob.got.some((e) => e.message?.conversationId === convA));

// Authorization (IDOR)
r = await A.c.req(`/api/files/${fileId}`);
check("alice downloads her own file", r.status === 200 && (await r.text()) === "secret contents of alice");
check("download is forced attachment + nosniff + octet-stream",
  /^attachment/.test(r.headers.get("content-disposition") ?? "") && r.headers.get("x-content-type-options") === "nosniff" && r.headers.get("content-type") === "application/octet-stream");
r = await B.c.req(`/api/files/${fileId}`);
check("bob CANNOT download alice's file (404)", r.status === 404, r.status);
r = await B.c.req(`/api/conversations/${convA}/messages`);
check("bob CANNOT read alice's messages (404)", r.status === 404, r.status);
const fd2 = new FormData(); fd2.set("body", "injected");
r = await B.c.req(`/api/conversations/${convA}/messages`, { method: "POST", form: fd2 });
check("bob CANNOT post into alice's conversation (404)", r.status === 404, r.status);
r = await new Client().req(`/api/files/${fileId}`);
check("anonymous CANNOT download (401)", r.status === 401, r.status);
r = await admin.req(`/api/files/${fileId}`);
check("admin CAN download any file", r.status === 200);
r = await B.c.req("/api/admin/invites", { method: "POST", json: { label: "x" } });
check("guest CANNOT create invites (403)", r.status === 403, r.status);
r = await B.c.req("/api/admin/wol", { method: "POST" });
check("guest CANNOT trigger Wake-on-LAN (403)", r.status === 403, r.status);
r = await new Client().req("/api/admin/wol", { method: "POST" });
check("anonymous CANNOT trigger Wake-on-LAN (401)", r.status === 401, r.status);
r = await B.c.req("/api/admin/pc-status");
check("guest CANNOT read PC status (403)", r.status === 403, r.status);
r = await new Client().req("/api/admin/pc-status");
check("anonymous CANNOT read PC status (401)", r.status === 401, r.status);
r = await B.c.req(`/chat/${convA}`);
check("guest page for someone else's chat is 404", r.status === 404, r.status);
r = await B.c.req("/admin");
check("guest redirected away from /admin", r.status >= 300 && r.status < 400, r.status);

// Image sniffing: fake PNG header is inline-able, HTML disguised as .png is not
const png = Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), Buffer.alloc(32)]);
const f3 = new FormData(); f3.set("file", new File([png], "p.png", { type: "image/png" }));
r = await A.c.req(`/api/conversations/${convA}/messages`, { method: "POST", form: f3 });
check("real PNG flagged as image", (await r.json()).message?.file?.image === true);
const f4 = new FormData(); f4.set("file", new File([Buffer.from("<script>alert(1)</script>")], "x.png", { type: "image/png" }));
r = await A.c.req(`/api/conversations/${convA}/messages`, { method: "POST", form: f4 });
const m4 = (await r.json()).message;
check("HTML disguised as .png is NOT treated as image", m4?.file?.image === false);
r = await A.c.req(`/api/files/${m4.file.id}?inline=1`);
check("…and never served inline", /^attachment/.test(r.headers.get("content-disposition") ?? ""));

// Oversize
const big = new FormData(); big.set("file", new File([Buffer.alloc(52 * 1024 * 1024)], "big.bin"));
r = await A.c.req(`/api/conversations/${convA}/messages`, { method: "POST", form: big });
check("52 MB upload rejected (413)", r.status === 413, r.status);

// Chunked uploads (no Content-Length, as a proxy might send them) still work and are still capped
async function chunked(bytes) {
  const boundary = "----hub" + rand();
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="body"\r\n\r\nchunked hi\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="c.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const payload = Buffer.concat([head, Buffer.alloc(bytes), tail]);
  const stream = new ReadableStream({
    start(c) { for (let i = 0; i < payload.length; i += 65536) c.enqueue(payload.subarray(i, i + 65536)); c.close(); },
  });
  return fetch(BASE + `/api/conversations/${convA}/messages`, {
    method: "POST", body: stream, duplex: "half",
    headers: { cookie: A2.cookie, origin: BASE, "content-type": `multipart/form-data; boundary=${boundary}` },
  });
}
const A2 = new Client();
r = await A2.req("/api/auth/login", { method: "POST", json: { username: A.username, password: "correct-horse-battery" } });
r = await chunked(1000);
check("chunked upload without Content-Length accepted", r.status === 201, r.status);
r = await chunked(52 * 1024 * 1024);
check("chunked 52 MB upload capped (413)", r.status === 413, r.status);

// Login throttling
const t = new Client(); let last = 0;
for (let i = 0; i < 12; i++) last = (await t.req("/api/auth/login", { method: "POST", json: { username: "throttle" + 0, password: "bad" + i } })).status;
check("brute-force login gets throttled (429)", last === 429, last);

// Logout invalidates the session server-side (a stolen cookie stops working)
const stolen = A.c.cookie;
r = await A.c.req("/api/auth/logout", { method: "POST" });
check("logout ok", r.status === 200);
const replay = new Client();
replay.cookie = stolen;
r = await replay.req(`/api/conversations/${convA}/messages`);
check("old session cookie rejected after logout (401)", r.status === 401, r.status);

wsAdmin.ws.close(); wsBob.ws.close();
console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
