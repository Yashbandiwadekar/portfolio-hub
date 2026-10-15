import dgram from "node:dgram";
import net from "node:net";

// Wake-on-LAN target. Fixed server-side: the browser can only say "wake", never what or where.
export const WOL_MAC = "30:56:0F:40:A3:CC";
// Home LAN broadcast (192.168.29.0/24). Override with WOL_BROADCAST (comma-separated).
const TARGETS = (process.env.WOL_BROADCAST ?? "192.168.29.255").split(",").map((s) => s.trim());

/** Magic packet: 6 x 0xFF followed by the MAC repeated 16 times (102 bytes). */
export function magicPacket(mac: string): Buffer {
  const hex = mac.replace(/[^0-9a-f]/gi, "");
  if (hex.length !== 12) throw new Error("Invalid MAC address");
  const m = Buffer.from(hex, "hex");
  return Buffer.concat([Buffer.alloc(6, 0xff), ...Array.from({ length: 16 }, () => m)]);
}

/** Sends the packet to UDP port 9 on each broadcast address; resolves with the ones that succeeded. */
export function sendWol(mac = WOL_MAC): Promise<string[]> {
  const pkt = magicPacket(mac);
  return new Promise((resolve, reject) => {
    const sock = dgram.createSocket("udp4");
    sock.once("error", (e) => {
      sock.close();
      reject(e);
    });
    sock.bind(() => {
      sock.setBroadcast(true);
      const sent: string[] = [];
      let done = 0;
      for (const addr of TARGETS) {
        sock.send(pkt, 9, addr, (err) => {
          if (!err) sent.push(addr);
          if (++done === TARGETS.length) {
            sock.close();
            if (sent.length) resolve(sent);
            else reject(new Error("Could not send the packet on any broadcast address"));
          }
        });
      }
    });
  });
}

// Fixed IP of the same PC (DHCP reservation on the router), used for the on/off status.
export const WOL_HOST = process.env.WOL_HOST ?? "192.168.29.50";
const PROBE_PORTS = [445, 3389, 135]; // SMB, RDP, RPC: answered by this Windows PC when it's on

function probe(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port });
    const done = (alive: boolean) => {
      sock.destroy();
      resolve(alive);
    };
    sock.setTimeout(timeoutMs, () => done(false));
    sock.once("connect", () => done(true));
    // A refused connection still means the machine answered, so it's on.
    sock.once("error", (e: NodeJS.ErrnoException) => done(e.code === "ECONNREFUSED"));
  });
}

/** True if the PC answers on any probe port within ~1.5 s. */
export async function isPcUp(host = WOL_HOST): Promise<boolean> {
  const results = await Promise.all(PROBE_PORTS.map((p) => probe(host, p, 1500)));
  return results.some(Boolean);
}
