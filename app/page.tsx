import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { getUser } from "@/lib/dal";

// Deployed on the same PC and published through Cloudflare Tunnel.
const liveProjects = [
  {
    name: "Phoenix IDPS",
    tagline: "Threat forecasting engine",
    url: "https://phoenixidps.dpdns.org",
    blurb:
      "Turns network traffic into an evolving threat state: detects hostile behaviour, classifies the attack stage, and forecasts 60 seconds ahead how an intrusion may propagate, with MITRE ATT&CK mapping and a hash-chained audit ledger.",
    stack: ["Transformer world model", "CIC-IDS-2018", "MITRE ATT&CK", "SHA-256 audit chain"],
  },
  {
    name: "SecureMailScope",
    tagline: "Email security assessment & forensics",
    url: "https://mailscope.dpdns.org",
    blurb:
      "Upload a packet capture and get a deterministic security assessment of its email traffic: SMTP/IMAP/POP3 sessions, TLS and cipher audit, X.509 trust validation, a 0–100 risk score and exportable reports.",
    stack: ["PCAP forensics", "TLS / X.509 audit", "Risk scoring", "Python"],
  },
];

const projects = [
  {
    name: "Transformer-Based Web Application Firewall",
    stack: ["PyTorch", "FastAPI", "Redis", "Next.js", "PostgreSQL", "Docker"],
    points: [
      "Fine-tuned DistilBERT to detect anomalous HTTP traffic in real time, catching novel and zero-day attacks that signature rules miss.",
      "Deployed as a reverse-proxy gateway with Redis rate limiting, DDoS protection and a Next.js dashboard; containerised with Docker Compose and GitHub Actions CI.",
      "Tested against OWASP Juice Shop, WebGoat and DVWA.",
    ],
  },
  {
    name: "MCP–Splunk Threat-Monitoring Integration",
    stack: ["Python", "MCP", "Splunk", "SPL"],
    points: [
      "MCP server exposing Splunk to an LLM through three tools (health check, SPL search, alert retrieval) for natural-language SIEM queries.",
      "Validated end-to-end against the Splunk BOTS v3 dataset.",
    ],
  },
  {
    name: "This site — private portfolio hub",
    stack: ["Next.js", "SQLite", "WebSockets", "Cloudflare Tunnel"],
    points: [
      "Invite-only chat and file drop, self-hosted and published through a Cloudflare Tunnel with no inbound ports open.",
      "Argon2id passwords, hashed server-side sessions, per-conversation authorization, audit log. See the repo README for the threat model.",
    ],
  },
];

const skills: [string, string][] = [
  ["Security", "OWASP Top 10, threat modelling, VAPT, penetration testing, Burp Suite, least-privilege access (IAM), Zero Trust, firewall / ACL concepts"],
  ["Security operations", "Splunk / SIEM, SPL, ELK / OpenSearch, Wazuh, TheHive, MISP, MITRE ATT&CK, log analysis"],
  ["Networking", "TCP/IP, DNS, HTTP/S, reverse proxy (Nginx), rate limiting, DDoS protection, Wireshark"],
  ["Cloud & infra", "AWS (shared responsibility, security groups, NACLs), Linux, Windows, Docker, Docker Compose"],
  ["Code", "Python, SQL, JavaScript / TypeScript, C / C++, Git, GitHub Actions"],
  ["AI / ML", "PyTorch, Transformers (DistilBERT), scikit-learn, LangChain, MCP"],
];

const certs = [
  ["AWS Certified Cloud Practitioner", "Amazon Web Services · Oct 2026"],
  ["SEC1 – Cyber Security 101", "TryHackMe · Jul 2026 · proctored exam"],
  ["AWS re/Start Graduate", "Amazon Web Services · Jun 2026"],
  ["SEC0 – Pre-Security", "TryHackMe"],
];

export default async function Home() {
  const user = await getUser();
  const hasPhoto = fs.existsSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "yash.jpg"));

  return (
    <div className="wrap">
      <nav className="nav">
        <span className="brand">yash.dev</span>
        {user ? (
          <Link className="btn primary" href={user.role === "admin" ? "/admin" : "/chat"}>
            {user.role === "admin" ? "Admin" : "Open chat"}
          </Link>
        ) : (
          <Link className="btn" href="/login">Friends &amp; family sign-in</Link>
        )}
      </nav>

      <header className="hero">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="avatar" src="/yash.jpg" alt="Yash Bandiwadekar" width={140} height={140} />
        ) : (
          <div className="avatar" aria-hidden>YB</div>
        )}
        <div>
          <div className="tag">Cybersecurity · SOC · VAPT</div>
          <h1>Yash Bandiwadekar</h1>
          <p>
            Final-year B.E. Computer Science (Cybersecurity, IoT &amp; Blockchain) at M.H. Saboo Siddik College of
            Engineering, Mumbai. AWS Certified Cloud Practitioner. Targeting IT operations security roles.
          </p>
          <div className="cta">
            <a className="btn primary" href="https://linkedin.com/in/yash-bandiwadekar" target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
            <Link className="btn" href="/login">Leave me a message</Link>
          </div>
        </div>
      </header>

      <section className="block" id="live">
        <h2>Live projects</h2>
        <div className="live-grid">
          {liveProjects.map((p) => (
            <a className="card live-card" key={p.url} href={p.url} target="_blank" rel="noopener noreferrer">
              <span className="live-badge"><span className="status on" /> Live</span>
              <h3>{p.name}</h3>
              <div className="meta">{p.tagline}</div>
              <p>{p.blurb}</p>
              <div className="chips">{p.stack.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
              <span className="live-open">{p.url.replace("https://", "")} ↗</span>
            </a>
          ))}
        </div>
      </section>

      <section className="block">
        <h2>Experience</h2>
        <div className="card">
          <h3>SOC Intern (Remote) — Shridhar InfoSec Solutions</h3>
          <div className="meta">Oct 2026 – Jan 2027</div>
          <ul>
            <li>Monitor and triage SIEM alerts (Wazuh) as an L1 analyst, record cases in TheHive, and enrich alerts with MISP threat intelligence.</li>
            <li>Support detection rule writing and tuning mapped to MITRE ATT&amp;CK; draft shift handovers, SOPs and incident summaries.</li>
          </ul>
        </div>
        <div className="card">
          <h3>President — VAPT Excellence Centre</h3>
          <div className="meta">2025 – Present · the college&apos;s student cybersecurity cell</div>
          <ul>
            <li>Lead VAPT activities, workshops and hands-on security training; coordinate 35+ students on security projects and CTF participation.</li>
          </ul>
        </div>
      </section>

      <section className="block">
        <h2>Projects</h2>
        {projects.map((p) => (
          <div className="card" key={p.name}>
            <h3>{p.name}</h3>
            <div className="chips">{p.stack.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
            <ul>{p.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
          </div>
        ))}
      </section>

      <section className="block">
        <h2>Skills</h2>
        <dl className="skills" style={{ margin: 0 }}>
          {skills.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="block">
        <h2>Certifications &amp; awards</h2>
        {certs.map(([n, m]) => (
          <div className="card" key={n}>
            <h3>{n}</h3>
            <div className="meta">{m}</div>
          </div>
        ))}
        <div className="card">
          <h3>Best Research Paper — Cybersecurity Track</h3>
          <div className="meta">International Conference on Smart Systems for Sustainable Development · Apr 2026</div>
        </div>
      </section>

      <section className="block">
        <h2>Education</h2>
        <div className="card">
          <h3>B.E. Computer Science Engineering (Cybersecurity) · CGPA 8.84</h3>
          <div className="meta">M.H. Saboo Siddik College of Engineering, Mumbai University · 2023 – 2027</div>
        </div>
      </section>

      <section className="block">
        <h2>Friends &amp; family corner</h2>
        <div className="notice">
          Know me? Ask me for an invite link, then sign in to chat with me, leave a message, or share a file. Everything
          is private between you and me.
        </div>
      </section>

      <footer>© {new Date().getFullYear()} Yash Bandiwadekar</footer>
    </div>
  );
}
