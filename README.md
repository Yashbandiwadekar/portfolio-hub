# portfolio-hub

My portfolio site, plus a **private, invite-only chat and file drop**.
Self-hosted on my own PC and published through a **Cloudflare Tunnel** (no inbound ports open).

- `/` public portfolio
- `/login`, `/join?code=…` invite-only accounts
- `/chat` one private 1:1 conversation per guest: text, live updates (WebSocket), file upload/download
- `/admin` me only: guests, single-use invites, enable/disable guests, recent security events

**Stack:** Next.js (App Router, TypeScript) · custom Node server (`server.ts`) adding a `ws` WebSocket endpoint ·
SQLite (`better-sqlite3`) · Argon2id (`@node-rs/argon2`) · zod.

## Run it

```bash
npm install
cp .env.example .env.local          # set COOKIE_SECURE=false only for plain http://localhost
npm run create-admin -- yash "Yash"  # prompts for password (12+ chars)
npm run dev                          # http://localhost:3000
```

Production: `npm run build && npm start`. (`next start` is **not** used: the custom server is what serves `/ws`.)

Private data (SQLite DB + `uploads/`) lives in `DATA_DIR`, default `../portfolio-hub-data`: outside the repo and
outside `public/`. **Back that folder up.**

Tests: start a server against a throwaway `DATA_DIR`, then
`ADMIN_USER=… ADMIN_PASS=… node tests/e2e.mjs` (32 checks: invite flow, CSRF/Origin, WebSocket auth, cross-user
access, upload handling, chunked uploads, throttling, logout).

## Threat model (short version)

**Assets:** guests' messages and files; the host PC; my account.
**Attackers considered:** an unauthenticated internet user; a logged-in guest trying to reach another guest's data; a
malicious uploader; a cross-site attacker abusing a logged-in guest's browser.

| Threat | Control |
| --- | --- |
| Exposing my home network | Cloudflare Tunnel (outbound-only). App binds `127.0.0.1`, so nothing but the tunnel can reach it. |
| Open sign-up / spam | No public registration. Accounts need a single-use, 7-day, 128-bit invite code (stored only as a SHA-256 hash). |
| Password guessing | Argon2id hashing; per-IP and per-username throttling; constant-ish timing for unknown users; all attempts audit-logged. |
| Session theft / fixation | Random 256-bit token in an `HttpOnly; Secure; SameSite=Lax; __Host-` cookie. Server stores only its hash, so a DB leak yields no usable sessions. Logout and "disable guest" revoke server-side. |
| Reading someone else's data (IDOR) | One authorization function (`canAccessConversation`) guards every message/file query; guests get `404` (not `403`) so ids can't be probed. Covered by e2e tests (guest B vs guest A's messages, files, posting). |
| CSRF / cross-site WebSocket hijacking | `Origin` must match `Host` on every state-changing request and on the WebSocket upgrade, on top of `SameSite=Lax`. |
| Malicious upload | Stored under a random UUID outside the web root (user filenames never touch the filesystem); content type decided by magic bytes, never the client; served `attachment` + `nosniff` + `CSP: sandbox` through an authenticated route; only real raster images may render inline; 50 MB/file and 500 MB/user caps. |
| XSS | React escaping; nonce-based CSP (`proxy.ts`); no `dangerouslySetInnerHTML`. |
| Live sockets outliving access | WebSocket re-validates the session every 30 s; guests only subscribe to their own conversation. |

**Known limits (deliberate trade-offs):**
- Not end-to-end encrypted. I can read every conversation, and Cloudflare terminates TLS at its edge.
- Files are not virus-scanned yet (idea: scan on upload with Microsoft Defender's `MpCmdRun.exe`).
- No 2FA. The password plus invite-only access is the bar; optional second layer: Cloudflare Access (email OTP) in front of `/chat`.
- `style-src` allows `'unsafe-inline'` (React inline style attributes can't carry a nonce).
- Single-process, in-memory rate limiting. Fine for one server, not for a cluster.
- Uploads are buffered in memory (≤ 50 MB) before being written. Fine at small scale.
- Availability = my PC being on.

## Publishing with Cloudflare Tunnel

Needs a domain whose DNS is on Cloudflare (a free `*.trycloudflare.com` quick tunnel works for a demo, but the URL
changes every restart).

```powershell
winget install Cloudflare.cloudflared
cloudflared tunnel login
cloudflared tunnel create portfolio-hub
cloudflared tunnel route dns portfolio-hub me.example.com
```

`%USERPROFILE%\.cloudflared\config.yml`:

```yaml
tunnel: <TUNNEL-ID>
credentials-file: C:\Users\<you>\.cloudflared\<TUNNEL-ID>.json
ingress:
  - hostname: me.example.com
    service: http://127.0.0.1:3000
  - service: http_status:404
```

**First-run smoke check on the public URL:** sign in, send a text message, send a file, and confirm the "Live" dot
turns green. The Origin check (`Origin` host must equal `Host`) assumes cloudflared forwards the public hostname in
`Host`. If sends fail with 403 or the dot stays grey, check cloudflared's per-origin Host-header setting.

Then run the tunnel as a service (`cloudflared service install`), run the app at boot (Task Scheduler:
`npm start` in this folder), and turn off PC sleep. Cloudflare's free plan caps request bodies at 100 MB, so the
50 MB upload limit stays under it.
