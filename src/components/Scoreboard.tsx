import { knowledgeTier } from "../../shared/protocol";
import type { RoomState } from "../../shared/protocol";

const MAX_SCORE = 1000;

interface Props {
  state: RoomState;
  meId: string;
}

const TIER_COLOR: Record<string, string> = {
  CASUAL: "#4a4550",
  "HIGHLIGHTS ONLY": "#6b7cad",
  HOOPER: "#fdb927",
  ELITE: "#e06b2a",
  SAVANT: "#1faa59",
};

export default function Scoreboard({ state, meId }: Props) {
  const guessing = state.phase === "guessing" || state.phase === "countdown";
  return (
    <ul className="scoreboard">
      {state.players.map((p) => {
        const answered = guessing && state.answeredIds.includes(p.id);
        const skipped = guessing && state.skippedIds.includes(p.id);
        const tier = knowledgeTier(p.knowledgeScore);
        const tierPct = Math.min(100, (p.knowledgeScore / MAX_SCORE) * 100);
        const tierColor = TIER_COLOR[tier];
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
              <div
                className="thermo-fill"
                style={{ width: `${Math.max(tierPct, 4)}%`, background: tierColor }}
              />
            </div>
            <span className="thermo-label" style={{ color: tierColor }}>{tier}</span>
          </li>
        );
      })}
    </ul>
  );
}
