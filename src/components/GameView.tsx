import { useEffect, useRef, useState } from "react";
import type { CluePublic, RoomState, SearchablePlayer } from "../../shared/protocol";
import { ROUND_MS, SOLO_ROUNDS, knowledgeTier } from "../../shared/protocol";
import { serverNow, socket } from "../socket";
import PlayerSearch from "./PlayerSearch";
import Scoreboard from "./Scoreboard";
import Silhouette from "./Silhouette";

function ClueCard({ clue, imageUrl, revealed }: { clue: CluePublic; imageUrl?: string; revealed?: boolean }) {
  const src = imageUrl ?? clue.imageUrl;
  if (src) {
    return (
      <div className={`clue-card clue-card-photo ${revealed ? "is-revealed" : ""}`}>
        <img className="clue-photo" src={src} alt="mystery player" draggable={false} />
      </div>
    );
  }
  return (
    <div className={`clue-card ${revealed ? "is-revealed" : ""}`} style={{ background: clue.color ?? "#222" }}>
      <Silhouette />
      <span className="clue-jersey">#{clue.jersey}</span>
      {!revealed && <span className="clue-colorname">{clue.colorName}</span>}
    </div>
  );
}

interface Props {
  state: RoomState;
  meId: string;
}

export default function GameView({ state, meId }: Props) {
  const { phase, revealAt, clue, lastResult } = state;

  const [revealed, setRevealed] = useState(false);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [shotClock, setShotClock] = useState(ROUND_MS);
  const [myPick, setMyPick] = useState<SearchablePlayer | null>(null);
  // performance.now() at the instant the clue appeared on THIS device —
  // reaction time is measured locally so network latency doesn't matter.
  const revealMark = useRef(0);

  // New round → wipe local round state.
  useEffect(() => {
    setRevealed(false);
    setMyPick(null);
    setCountdownNum(null);
  }, [state.roundNumber]);

  // Schedule the reveal at the server-synchronized instant.
  useEffect(() => {
    if (revealAt == null) return;
    const remaining = revealAt - serverNow();
    if (remaining <= 0) {
      // Mid-round joiner: clue is already live; their clock starts now.
      revealMark.current = performance.now();
      setRevealed(true);
      return;
    }
    setCountdownNum(Math.ceil(remaining / 1000));
    const reveal = setTimeout(() => {
      revealMark.current = performance.now();
      setRevealed(true);
    }, remaining);
    const tick = setInterval(() => {
      setCountdownNum(Math.max(1, Math.ceil((revealAt - serverNow()) / 1000)));
    }, 100);
    return () => {
      clearTimeout(reveal);
      clearInterval(tick);
    };
  }, [revealAt, state.roundNumber]);

  // Preload the headshot during the countdown so the reveal isn't gated on
  // image load (the per-round URL is anonymous, so this leaks nothing).
  useEffect(() => {
    if (clue?.imageUrl) {
      const img = new Image();
      img.src = clue.imageUrl;
    }
  }, [clue?.imageUrl]);

  // Shot clock once revealed.
  useEffect(() => {
    if (!revealed || phase === "result") return;
    const tick = setInterval(() => {
      setShotClock(Math.max(0, ROUND_MS - (performance.now() - revealMark.current)));
    }, 100);
    return () => clearInterval(tick);
  }, [revealed, phase]);

  const answered = myPick !== null || state.answeredIds.includes(meId);
  const skipped = state.skippedIds.includes(meId);

  const onPick = (p: SearchablePlayer) => {
    if (answered) return;
    const elapsedMs = Math.round(performance.now() - revealMark.current);
    setMyPick(p);
    socket.emit("submitAnswer", { pickedId: p.id, elapsedMs });
  };

  // ---- result --------------------------------------------------------------
  if (phase === "result" && lastResult) {
    const iWon = lastResult.winnerId === meId;
    const isSolo = state.players.length === 1;
    const diffTier = knowledgeTier(500 + (lastResult.difficulty - 50) * 4); // map 0-100 diff → tier label
    return (
      <main className="game">
        <Scoreboard state={state} meId={meId} />
        <section className={`result ${lastResult.winnerId && !isSolo ? "" : "result-airball"}`}>
          <p className="result-callout">
            {isSolo
              ? lastResult.winnerId
                ? "BUCKET!"
                : "SKIPPED / MISSED"
              : lastResult.winnerId
                ? iWon
                  ? "BUCKET! YOU BURIED IT"
                  : `${lastResult.winnerNickname} BURIES IT`
                : "AIRBALL — NOBODY GOT IT"}
            {!isSolo && lastResult.winnerElapsedMs != null && (
              <span className="result-ms"> {lastResult.winnerElapsedMs}ms</span>
            )}
          </p>
          <ClueCard clue={lastResult.clue} imageUrl={lastResult.revealedImageUrl} revealed />
          <p className="result-name">{lastResult.clueName}</p>
          <span className="difficulty-badge" data-tier={diffTier}>
            DIFFICULTY {lastResult.difficulty} · {diffTier}
          </span>
          {!isSolo && (
            <ul className="result-answers">
              {lastResult.answers.map((a) => (
                <li key={a.playerId} className={a.correct ? "ok" : "miss"}>
                  <span className="result-answer-mark">{a.correct ? "●" : "✕"}</span>
                  <span className="result-answer-nick">{a.nickname}</span>
                  <span className="result-answer-pick">{a.pickedName}</span>
                  <span className="result-answer-ms">{a.elapsedMs}ms</span>
                </li>
              ))}
              {lastResult.answers.length === 0 && <li className="miss">no answers came in</li>}
            </ul>
          )}
          {isSolo && (
            <p className="solo-round-counter">
              ROUND {lastResult.roundNumber} OF {SOLO_ROUNDS}
            </p>
          )}
          <div className="next-bar" key={lastResult.roundNumber} />
        </section>
      </main>
    );
  }

  // ---- countdown / guessing -------------------------------------------------
  return (
    <main className="game">
      <Scoreboard state={state} meId={meId} />

      <div className="game-meta">
        <span className="round-label">ROUND {state.roundNumber}</span>
        {revealed && (
          <span className={`shot-clock ${shotClock < 5000 ? "is-low" : ""}`}>
            {(shotClock / 1000).toFixed(1)}
          </span>
        )}
      </div>

      {state.cluePoolRecycled && state.roundNumber > 0 && !revealed && (
        <p className="recycle-note">fresh clues exhausted — running it back with repeats</p>
      )}

      {!revealed ? (
        <section className="countdown">
          <span className="countdown-num" key={countdownNum ?? 0}>
            {countdownNum ?? "…"}
          </span>
          <p className="countdown-hint">EYES UP. HANDS READY.</p>
        </section>
      ) : (
        <section className="play">
          {clue && <ClueCard clue={clue} />}

          {answered ? (
            <div className="locked">
              <p className="locked-title">LOCKED IN</p>
              {myPick && <p className="locked-pick">{myPick.name}</p>}
              <p className="locked-wait">
                waiting on{" "}
                {state.players
                  .filter((p) => p.connected && !state.answeredIds.includes(p.id) && !state.skippedIds.includes(p.id))
                  .map((p) => p.nickname)
                  .join(", ") || "the buzzer"}
                …
              </p>
            </div>
          ) : skipped ? (
            <div className="locked">
              <p className="locked-title">SKIPPED</p>
              <p className="locked-wait">
                waiting on{" "}
                {state.players
                  .filter((p) => p.connected && !state.answeredIds.includes(p.id) && !state.skippedIds.includes(p.id))
                  .map((p) => p.nickname)
                  .join(", ") || "the buzzer"}
                …
              </p>
            </div>
          ) : (
            <>
              <PlayerSearch disabled={!revealed} onPick={onPick} />
              <button className="btn btn-ghost btn-skip" onClick={() => socket.emit("skipRound")}>
                SKIP
              </button>
            </>
          )}
        </section>
      )}
    </main>
  );
}
