import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { WOL_HOST } from "./wol";

// A dedicated key whose ONLY power is shutdown: the PC's authorized_keys entry pins it to a forced
// `shutdown` command and to the server's IP. The PC's host key must already be in known_hosts.
const KEY = process.env.PC_SHUTDOWN_KEY ?? path.join(os.homedir(), ".ssh", "pc_shutdown_ed25519");
const USER = process.env.PC_SSH_USER ?? "Yash";

export function shutdownPc(): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      "ssh",
      [
        "-i", KEY,
        "-o", "BatchMode=yes",
        "-o", "IdentitiesOnly=yes",
        "-o", "StrictHostKeyChecking=yes",
        "-o", "ConnectTimeout=5",
        `${USER}@${WOL_HOST}`,
      ],
      { timeout: 15_000 },
      (err, _stdout, stderr) => (err ? reject(new Error(stderr.trim() || err.message)) : resolve()),
    );
  });
}
