import dgram from "node:dgram";

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
