import Link from "next/link";
import { DisableToggle, InviteForm } from "@/components/AdminPanel";
import { LogoutButton } from "@/components/LogoutButton";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "Admin — Yash Bandiwadekar", robots: { index: false } };

type Guest = { id: string; display_name: string; username: string; disabled: number; conv: string; last: number | null; count: number };
type Invite = { label: string; created_at: number; status: string };
type Audit = { ts: number; action: string; detail: string | null; ip: string | null };

const when = (ts: number) => new Date(ts).toISOString().slice(0, 16).replace("T", " ") + " UTC";

export default async function AdminPage() {
  await requireAdmin();
  const db = getDb();
  const guests = db
    .prepare(
      `SELECT u.id, u.display_name, u.username, u.disabled, c.id AS conv,
              (SELECT MAX(created_at) FROM messages WHERE conversation_id = c.id) AS last,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) AS count
         FROM users u JOIN conversations c ON c.guest_id = u.id
        ORDER BY last DESC NULLS LAST, u.created_at DESC`,
    )
    .all() as Guest[];
  const invites = db.prepare("SELECT label, created_at, CASE WHEN used_at IS NOT NULL THEN 'used' WHEN expires_at < CAST(strftime('%s','now') AS INTEGER) * 1000 THEN 'expired' ELSE 'pending' END AS status FROM invites ORDER BY created_at DESC LIMIT 20").all() as Invite[];
  const audit = db.prepare("SELECT ts, action, detail, ip FROM audit_log ORDER BY id DESC LIMIT 25").all() as Audit[];

  return (
    <div className="wrap">
      <nav className="nav">
        <span className="brand">Admin</span>
        <div className="row">
          <Link className="btn" href="/">Portfolio</Link>
          <LogoutButton />
        </div>
      </nav>

      <section className="block">
        <h2>Guests</h2>
        {guests.length === 0 ? (
          <div className="notice">No guests yet. Create an invite below and send the link.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Name</th><th>Messages</th><th>Last activity</th><th></th><th></th></tr></thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id}>
                  <td><Link href={`/chat/${g.conv}`}>{g.display_name}</Link> <span className="chip">{g.username}</span></td>
                  <td>{g.count}</td>
                  <td>{g.last ? when(g.last) : "—"}</td>
                  <td>{g.disabled ? <span className="chip">disabled</span> : null}</td>
                  <td><DisableToggle id={g.id} disabled={!!g.disabled} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="block">
        <h2>Invites</h2>
        <InviteForm />
        {invites.length > 0 && (
          <table className="table" style={{ marginTop: 16 }}>
            <thead><tr><th>For</th><th>Created</th><th>Status</th></tr></thead>
            <tbody>
              {invites.map((i, n) => (
                <tr key={n}>
                  <td>{i.label}</td>
                  <td>{when(i.created_at)}</td>
                  <td>{i.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="block">
        <h2>Recent security events</h2>
        <table className="table">
          <thead><tr><th>Time</th><th>Event</th><th>Detail</th><th>IP</th></tr></thead>
          <tbody>
            {audit.map((a, n) => (
              <tr key={n}><td>{when(a.ts)}</td><td>{a.action}</td><td>{a.detail?.slice(0, 40)}</td><td>{a.ip}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
