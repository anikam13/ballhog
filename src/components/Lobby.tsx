import { useState } from "react";
import type { RoomState } from "../../shared/protocol";
import { MIN_PLAYERS, MAX_TARGET_SCORE, MIN_TARGET_SCORE } from "../../shared/protocol";
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

  const canTipOff = everyoneReady && isHost;

  return (
    <main className="lobby">
      <div className="lobby-body">
        <section className="code-card">
          <span className="code-card-label">ROOM CODE</span>
          <span className="code-card-code">{state.code}</span>
          <button className="btn btn-small btn-invite" onClick={invite}>
            {shareLabel}
          </button>
          {connected.length > 1 && <span className="code-card-hint">up to 5 players</span>}
        </section>

        <ul className="roster">
          {state.players.map((p, i) => (
            <li
              key={p.id}
              className={`roster-card ${p.ready ? "is-ready" : ""} ${p.connected ? "" : "is-gone"}`}
            >
              <span className="roster-num">{i + 1}</span>
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

        <section className="lobby-target" aria-label={`First to ${state.targetScore} correct guesses`}>
          <span className="lobby-target-label">FIRST TO</span>
          {isHost ? (
            <div className="lobby-target-stepper">
              <button
                type="button"
                className="lobby-target-btn"
                disabled={state.targetScore <= MIN_TARGET_SCORE}
                onClick={() => socket.emit("setTargetScore", state.targetScore - 1)}
                aria-label="Fewer correct guesses"
              >
                −
              </button>
              <span className="lobby-target-value">{state.targetScore}</span>
              <button
                type="button"
                className="lobby-target-btn"
                disabled={state.targetScore >= MAX_TARGET_SCORE}
                onClick={() => socket.emit("setTargetScore", state.targetScore + 1)}
                aria-label="More correct guesses"
              >
                +
              </button>
            </div>
          ) : (
            <span className="lobby-target-value lobby-target-value-readonly">{state.targetScore}</span>
          )}
          <span className="lobby-target-sublabel">correct guesses</span>
        </section>
      </div>

      <div className="lobby-actions">
        {canTipOff ? (
          <button className="btn btn-go" onClick={() => socket.emit("startGame")}>
            TIP OFF
          </button>
        ) : everyoneReady ? (
          <p className="lobby-wait">waiting for the host…</p>
        ) : (
          <p className="lobby-wait lobby-wait-dots" aria-label="Waiting for players to ready up">
            …
          </p>
        )}

        <button
          className={`btn ${me.ready ? "btn-ghost" : "btn-primary"}`}
          onClick={() => socket.emit("toggleReady")}
        >
          {me.ready ? "UNREADY" : "READY UP"}
        </button>

        <button className="btn btn-ghost btn-small" onClick={onLeave}>
          LEAVE ROOM
        </button>
      </div>
    </main>
  );
}
