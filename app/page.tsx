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

const experience = [
  {
    role: "SOC Intern (Remote)",
    org: "Shridhar InfoSec Solutions",
    period: "Oct 2026 – Jan 2027",
    note: null,
    url: "https://www.shridharinfosec.com/",
    points: [
      "Monitor and triage SIEM alerts (Wazuh) as an L1 analyst, record cases in TheHive, and enrich alerts with MISP threat intelligence.",
      "Support detection rule writing and tuning mapped to MITRE ATT&CK; draft shift handovers, SOPs and incident summaries.",
    ],
  },
  {
    role: "President",
    org: "VAPT Excellence Centre",
    period: "2025 – Present",
    note: "the college's student cybersecurity cell",
    url: "https://vapt-mhssce.vercel.app/",
    points: [
      "Lead VAPT activities, workshops and hands-on security training; coordinate 35+ students on security projects and CTF participation.",
    ],
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

const stats = [
  { value: "8.84", label: "CGPA, B.E. Cybersecurity" },
  { value: "35+", label: "students coordinated at the VAPT cell" },
  { value: "AWS", label: "Certified Cloud Practitioner" },
  { value: "Best paper", label: "Cybersecurity track, Apr 2026" },
];

const sections = [
  { id: "experience", label: "Experience" },
  { id: "live", label: "Live" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "credentials", label: "Credentials" },
];

// Split a comma list without breaking parenthesised groups, e.g. "AWS (a, b), Linux".
const splitList = (s: string) => s.split(/,\s*(?![^()]*\))/);

const NewTab = () => <span className="sr-only"> (opens in a new tab)</span>;

function SectionHead({ index, title, id }: { index: string; title: string; id: string }) {
  return (
    <div className="section-head">
      <span className="section-index" aria-hidden>{index}</span>
      <h2 id={`${id}-title`}>{title}</h2>
    </div>
  );
}

export default async function Home() {
  const user = await getUser();
  const hasPhoto = fs.existsSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "yash.jpg"));

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>

      <header className="topbar">
        <div className="wrap topbar-inner">
          <a className="brand" href="#top">
            <span className="brand-mark" aria-hidden>YB</span>
            <span>yash.dev</span>
          </a>
          <nav className="anchors" aria-label="Sections">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}>{s.label}</a>
            ))}
          </nav>
          {user ? (
            <Link className="btn primary" href={user.role === "admin" ? "/admin" : "/chat"}>
              {user.role === "admin" ? "Admin" : "Open chat"}
            </Link>
          ) : (
            <Link className="btn" href="/login">Sign in</Link>
          )}
        </div>
      </header>

      <main id="main" className="wrap">
        <section className="hero" id="top" aria-labelledby="hero-name">
          <div className="hero-copy">
            <p className="eyebrow">Cybersecurity · SOC · VAPT</p>
            <h1 id="hero-name">Yash Bandiwadekar</h1>
            <p className="lede">
              Final-year B.E. Computer Science (Cybersecurity, IoT &amp; Blockchain) at M.H. Saboo Siddik College of
              Engineering, Mumbai. AWS Certified Cloud Practitioner. Targeting IT operations security roles.
            </p>
            <div className="cta">
              <a className="btn primary" href="https://linkedin.com/in/yash-bandiwadekar" target="_blank" rel="noopener noreferrer">
                LinkedIn <span aria-hidden>↗</span><NewTab />
              </a>
              <Link className="btn" href="/login">Leave me a message</Link>
            </div>
          </div>

          <aside className="badge" aria-label="Currently">
            <div className="badge-top">
              <span className="pulse" aria-hidden />
              <span>Currently</span>
            </div>
            <div className="badge-id">
              {hasPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="avatar" src="/yash.jpg" alt="Yash Bandiwadekar" width={96} height={96} />
              ) : (
                <div className="avatar" aria-hidden>YB</div>
              )}
              <dl className="fields">
                <div><dt>role</dt><dd>SOC Intern (Remote)</dd></div>
                <div><dt>org</dt><dd>Shridhar InfoSec Solutions</dd></div>
                <div><dt>lead</dt><dd>President, VAPT Excellence Centre</dd></div>
                <div><dt>target</dt><dd>IT operations security roles</dd></div>
              </dl>
            </div>
          </aside>
        </section>

        <ul className="stats" aria-label="Highlights">
          {stats.map((s) => (
            <li key={s.label}>
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </li>
          ))}
        </ul>

        <section className="block" id="experience" aria-labelledby="experience-title">
          <SectionHead index="01" title="Experience" id="experience" />
          <ol className="timeline">
            {experience.map((e) => (
              <li key={e.url} className="timeline-item">
                <a className="card link-card" href={e.url} target="_blank" rel="noopener noreferrer">
                  <div className="card-row">
                    <h3>
                      {e.role} <span className="sep">—</span> <span className="org">{e.org}</span>
                    </h3>
                    <span className="arrow" aria-hidden>↗</span>
                  </div>
                  <div className="meta">
                    <span className="mono">{e.period}</span>
                    {e.note ? <> · {e.note}</> : null}
                  </div>
                  <ul className="points">
                    {e.points.map((pt) => <li key={pt}>{pt}</li>)}
                  </ul>
                  <span className="host">{e.url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}<NewTab /></span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <section className="block" id="live" aria-labelledby="live-title">
          <SectionHead index="02" title="Live projects" id="live" />
          <div className="grid-2">
            {liveProjects.map((p) => (
              <a className="card link-card live-card" key={p.url} href={p.url} target="_blank" rel="noopener noreferrer">
                <div className="live-bar">
                  <span className="live-badge"><span className="status on" aria-hidden /> Live</span>
                  <span className="arrow" aria-hidden>↗</span>
                </div>
                <h3>{p.name}</h3>
                <div className="meta">{p.tagline}</div>
                <p>{p.blurb}</p>
                <div className="chips">{p.stack.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
                <span className="host">{p.url.replace("https://", "")}<NewTab /></span>
              </a>
            ))}
          </div>
        </section>

        <section className="block" id="projects" aria-labelledby="projects-title">
          <SectionHead index="03" title="Projects" id="projects" />
          <div className="grid-2">
            {projects.map((p) => (
              <article className="card project" key={p.name}>
                <h3>{p.name}</h3>
                <div className="chips">{p.stack.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
                <ul className="points">{p.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        <section className="block" id="skills" aria-labelledby="skills-title">
          <SectionHead index="04" title="Skills" id="skills" />
          <dl className="skills">
            {skills.map(([k, v]) => (
              <div key={k} className="skill-group">
                <dt>{k}</dt>
                <dd>
                  <ul className="chips" aria-label={k}>
                    {splitList(v).map((s) => <li className="chip" key={s}>{s}</li>)}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="block" id="credentials" aria-labelledby="credentials-title">
          <SectionHead index="05" title="Certifications & awards" id="credentials" />
          <div className="stack">
            <div className="card award">
              <span className="award-tag">Award</span>
              <h3>Best Research Paper — Cybersecurity Track</h3>
              <div className="meta">International Conference on Smart Systems for Sustainable Development · Apr 2026</div>
            </div>
            <ul className="cert-list">
              {certs.map(([n, m]) => (
                <li key={n}>
                  <span className="cert-name">{n}</span>
                  <span className="cert-meta">{m}</span>
                </li>
              ))}
            </ul>
            <div className="badges">
              {[
                ["0ff06f85-4bda-4525-94f1-85bc143a5b68", "AWS Certified Cloud Practitioner"],
                ["5265e9ac-0ce2-433e-93e3-3d8c290cad25", "TryHackMe Cyber Security 101 (SEC1)"],
                ["54ad845f-d2f8-4d79-b199-0f9cd1376c18", "TryHackMe Pre Security (SEC0)"],
              ].map(([id, title]) => (
                <iframe
                  key={id}
                  src={`https://www.credly.com/embedded_badge/${id}`}
                  title={`${title} badge on Credly`}
                  width={150}
                  height={270}
                  loading="lazy"
                  scrolling="no"
                />
              ))}
              <iframe
                className="thm"
                src="https://tryhackme.com/badge/t/846ff7119ed6c8fbff74aa9be4210325138988e504a37c983c409a9bae5090866821c75a37d5b38c0f4b681cb248f066/embed?theme=dark"
                title="TryHackMe profile badge"
                width={400}
                height={172}
                loading="lazy"
                scrolling="no"
              />
            </div>
          </div>
        </section>

        <section className="block" id="education" aria-labelledby="education-title">
          <SectionHead index="06" title="Education" id="education" />
          <div className="card edu">
            <div>
              <h3>B.E. Computer Science Engineering (Cybersecurity)</h3>
              <div className="meta">M.H. Saboo Siddik College of Engineering, Mumbai University · <span className="mono">2023 – 2027</span></div>
            </div>
            <div className="edu-score">
              <span className="stat-value">8.84</span>
              <span className="stat-label">CGPA</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <span>© {new Date().getFullYear()} Yash Bandiwadekar</span>
          <span className="footer-links">
            <a href="https://linkedin.com/in/yash-bandiwadekar" target="_blank" rel="noopener noreferrer">LinkedIn<NewTab /></a>
            <Link href="/login">Leave me a message</Link>
            <a href="#top">Back to top ↑</a>
          </span>
        </div>
      </footer>
    </>
  );
}
