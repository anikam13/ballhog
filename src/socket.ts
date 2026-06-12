import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "../shared/protocol";

// Same-origin in dev (vite proxies /socket.io → :3001) and in prod.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

// serverTime - clientTime, refined by keeping the lowest-RTT sample. Used so
// every device reveals the clue at the same wall-clock instant.
let offset = 0;

export function serverNow(): number {
  return Date.now() + offset;
}

export async function syncTime(): Promise<void> {
  let bestRtt = Infinity;
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    const serverTime = await new Promise<number>((resolve) =>
      socket.emit("timesync", t0, resolve)
    );
    const rtt = Date.now() - t0;
    if (rtt < bestRtt) {
      bestRtt = rtt;
      offset = serverTime - (t0 + rtt / 2);
    }
  }
}
