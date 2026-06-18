import { useState } from "react";
import type { RoomState } from "../../shared/protocol";
import { MIN_PLAYERS } from "../../shared/protocol";
import { socket } from "../socket";
import { inviteUrl, share } from "../share";

interface Props {
  state: RoomState;
  meId: string;
  onLeave: () => void;
}

export default function Lobby({ state, meId, onLeave }: Props) {
  const me = state.players.find((p) => p.id === meId)!;
  const isHost = state.hostId === meId;
  const connected = state.players.filter((p) => p.connected);
  const everyoneReady = connected.length >= MIN_PLAYERS && connected.every((p) => p.ready);
  const [shareLabel, setShareLabel] = useState("INVITE YOUR SQUAD");

  const invite = async () => {
    const result = await share({
      title: "Ballhog",
      text: `Pull up to room ${state.code} on Ballhog. Name the hooper, fastest bucket wins.`,
      url: inviteUrl(state.code),
    });
    if (result === "copied") {
      setShareLabel("LINK COPIED");
      setTimeout(() => setShareLabel("INVITE YOUR SQUAD"), 2000);
    } else if (result === "failed") {
      setShareLabel(`SHARE ${inviteUrl(state.code)}`);
    }
  };

  return (
    <main className="lobby">
      <section className="code-card">
        <span className="code-card-label">ROOM CODE</span>
        <span className="code-card-code">{state.code}</span>
        <button className="btn btn-small btn-invite" onClick={invite}>
          {shareLabel}
        </button>
        <span className="code-card-hint">
          {connected.length === 1 ? "solo trial, or bring up to 4 more" : "up to 5 players"}
        </span>
      </section>

      <ul className="roster">
        {state.players.map((p, i) => (
          <li
            key={p.id}
            className={`roster-card ${p.ready ? "is-ready" : ""} ${p.connected ? "" : "is-gone"}`}
          >
            <span className="roster-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="roster-name">
              {p.nickname}
              {p.id === state.hostId && <span className="tag tag-host">HOST</span>}
              {p.id === meId && <span className="tag tag-you">YOU</span>}
            </span>
            <span className={`roster-status ${p.ready ? "ok" : ""}`}>
              {!p.connected ? "GONE" : p.ready ? "READY" : "WARMING UP"}
            </span>
          </li>
        ))}
      </ul>

      <div className="lobby-actions">
        <button
          className={`btn ${me.ready ? "btn-ghost" : "btn-primary"}`}
          onClick={() => socket.emit("toggleReady")}
        >
          {me.ready ? "UNREADY" : "READY UP"}
        </button>

        <button
          className="btn btn-go"
          disabled={!everyoneReady}
          onClick={() => socket.emit("startGame")}
        >
          {everyoneReady
            ? connected.length === 1 ? "GO SOLO" : "TIP-OFF"
            : "WAITING ON READIES"}
        </button>

        <button className="btn btn-ghost btn-small" onClick={onLeave}>
          LEAVE ROOM
        </button>
      </div>
    </main>
  );
}
