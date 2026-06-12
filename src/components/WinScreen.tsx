import type { RoomState } from "../../shared/protocol";
import { SOLO_ROUNDS, knowledgeTier } from "../../shared/protocol";
import { socket } from "../socket";
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

  if (isSolo && champ) {
    const finalTier = knowledgeTier(champ.knowledgeScore);
    return (
      <main className="win">
        <p className="win-kicker">TRIAL COMPLETE · {SOLO_ROUNDS} ROUNDS</p>
        <h1 className="win-name">{finalTier}</h1>
        <p className="win-sub">YOUR KNOWLEDGE RATING</p>
        <Scoreboard state={state} meId={meId} />
        <div className="win-actions">
          <button className="btn btn-go" onClick={() => socket.emit("rematch")}>
            RUN IT BACK
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
