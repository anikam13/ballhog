import { knowledgeTier } from "../../shared/protocol";
import type { RoomState } from "../../shared/protocol";

const ELITE_SCORE = 700;

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
        const skipped = guessing && state.skippedIds.includes(p.id);
        const tier = knowledgeTier(p.knowledgeScore);
        const tierPct = Math.min(100, (p.knowledgeScore / ELITE_SCORE) * 100);
        return (
          <li
            key={p.id}
            className={`score-chip ${p.id === meId ? "is-me" : ""} ${p.connected ? "" : "is-gone"} ${answered ? "has-answered" : ""} ${skipped ? "has-skipped" : ""}`}
          >
            <div className="score-chip-row">
              <span className="score-chip-name">{p.nickname}</span>
              <span className="score-chip-pts">{p.score}</span>
            </div>
            <div className="thermo">
              <div className="thermo-fill" style={{ width: `${tierPct}%` }} data-tier={tier} />
            </div>
            <span className="thermo-label">{tier}</span>
          </li>
        );
      })}
    </ul>
  );
}
