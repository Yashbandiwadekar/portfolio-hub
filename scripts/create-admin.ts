// Usage: npm run create-admin -- <username> "<Display Name>"   (password is prompted, input hidden)
import crypto from "node:crypto";
import readline from "node:readline";
import { hash } from "@node-rs/argon2";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

function promptHidden(q: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const w = (rl as unknown as { _writeToOutput: (s: string) => void });
    w._writeToOutput = (s: string) => {
      if (s.includes(q)) process.stdout.write(s);
    };
    rl.question(q, (a) => {
      rl.close();
      process.stdout.write("\n");
      resolve(a);
    });
  });
}

async function main() {
  const { getDb } = await import("../lib/db");
  const username = (process.argv[2] ?? "").toLowerCase();
  const displayName = process.argv[3] ?? "Yash";
  if (!/^[a-z0-9_.-]{3,24}$/.test(username)) throw new Error('Usage: npm run create-admin -- <username> "<Display Name>"');
  const password = process.env.ADMIN_PASSWORD ?? (await promptHidden("Password (min 12 chars): "));
  if (password.length < 12) throw new Error("Password too short");

  const db = getDb();
  if (db.prepare("SELECT 1 FROM users WHERE role = 'admin'").get()) throw new Error("An admin already exists.");
  db.prepare("INSERT INTO users (id, username, display_name, password_hash, role, created_at) VALUES (?,?,?,?, 'admin', ?)").run(
    crypto.randomUUID(),
    username,
    displayName,
    await hash(password),
    Date.now(),
  );
  console.log(`Admin '${username}' created.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
