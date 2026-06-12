import type { RoomState } from "../../shared/protocol";

interface Props {
  state: RoomState;
  meId: string;
}

export default function Scoreboard({ state, meId }: Props) {
  const guessing = state.phase === "guessing" || state.phase === "countdown";
  return (
    <ul className="scoreboard">
      {state.players.map((p) => {
        const answered = guessing && state.answeredIds.includes(p.id);
        return (
          <li
            key={p.id}
            className={`score-chip ${p.id === meId ? "is-me" : ""} ${p.connected ? "" : "is-gone"} ${answered ? "has-answered" : ""}`}
          >
            <span className="score-chip-name">{p.nickname}</span>
            <span className="score-chip-pts">{p.score}</span>
          </li>
        );
      })}
    </ul>
  );
}
