// Stable per-device identity + last-room session, so a refresh or dropped
// connection rejoins the same seat (score intact) instead of duplicating.

const PID_KEY = "ballhog:playerId";
const NICK_KEY = "ballhog:nickname";
const ROOM_KEY = "ballhog:room";

function makeUuid(): string {
  // crypto.randomUUID requires a secure context — unavailable when phones
  // load the app over plain http on the LAN (http://10.0.0.x:5173).
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function getPlayerId(): string {
  let id = localStorage.getItem(PID_KEY);
  if (!id) {
    id = makeUuid();
    localStorage.setItem(PID_KEY, id);
  }
  return id;
}

export function getNickname(): string {
  return localStorage.getItem(NICK_KEY) ?? "";
}

export function saveNickname(nickname: string) {
  localStorage.setItem(NICK_KEY, nickname);
}

export function saveRoom(code: string) {
  localStorage.setItem(ROOM_KEY, code);
}

export function loadRoom(): string | null {
  return localStorage.getItem(ROOM_KEY);
}

export function clearRoom() {
  localStorage.removeItem(ROOM_KEY);
}
