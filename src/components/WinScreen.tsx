import { useState } from "react";
import type { RoomState } from "../../shared/protocol";
import { SOLO_ROUNDS, knowledgeTier } from "../../shared/protocol";
import { socket } from "../socket";
import { share } from "../share";
import Scoreboard from "./Scoreboard";

interface Props {
  state: RoomState;
  meId: string;
  onLeave: () => void;
}

export default function WinScreen({ state, meId, onLeave }: Props) {
  const isSolo = state.players.length === 1;
  const champ = state.players.find((p) => p.id === state.gameWinnerId);
  const isHost = state.hostId === meId;
  const iWon = state.gameWinnerId === meId;
  const [shareLabel, setShareLabel] = useState("SHARE MY RATING");

  if (isSolo && champ) {
    const finalTier = knowledgeTier(champ.knowledgeScore);
    const shareRating = async () => {
      const result = await share({
        title: "Ballhog",
        text: `I rated ${finalTier} (${champ.knowledgeScore}/1000) on Ballhog's ${SOLO_ROUNDS}-round NBA knowledge trial. Think you watch more ball?`,
        url: location.origin,
      });
      if (result === "copied") {
        setShareLabel("COPIED");
        setTimeout(() => setShareLabel("SHARE MY RATING"), 2000);
      }
    };
    return (
      <main className="win">
        <p className="win-kicker">TRIAL COMPLETE · {SOLO_ROUNDS} ROUNDS</p>
        <h1 className="win-name">{finalTier}</h1>
        <p className="win-sub">YOUR KNOWLEDGE RATING · {champ.knowledgeScore}/1000</p>
        <Scoreboard state={state} meId={meId} />
        <div className="win-actions">
          <button className="btn btn-go" onClick={() => socket.emit("rematch")}>
            RUN IT BACK
          </button>
          <button className="btn btn-secondary" onClick={shareRating}>
            {shareLabel}
          </button>
          <button className="btn btn-ghost btn-small" onClick={onLeave}>
            LEAVE
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="win">
      <p className="win-kicker">{iWon ? "GAME. YOU'RE HIM." : "BALLGAME."}</p>
      <h1 className="win-name">{champ?.nickname ?? "???"}</h1>
      <p className="win-sub">
        TAKES IT {champ?.score ?? 0}–
        {Math.max(0, ...state.players.filter((p) => p.id !== state.gameWinnerId).map((p) => p.score))}
      </p>

      <Scoreboard state={state} meId={meId} />

      <div className="win-actions">
        {isHost ? (
          <button className="btn btn-go" onClick={() => socket.emit("rematch")}>
            RUN IT BACK
          </button>
        ) : (
          <p className="lobby-wait">waiting for the host to run it back…</p>
        )}
        <button className="btn btn-ghost btn-small" onClick={onLeave}>
          LEAVE ROOM
        </button>
      </div>
    </main>
  );
}
