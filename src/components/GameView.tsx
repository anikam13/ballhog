import { useEffect, useRef, useState } from "react";
import type { CluePublic, RoomState, SearchablePlayer } from "../../shared/protocol";
import { RESULT_MS, ROUND_MS } from "../../shared/protocol";
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

const PauseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

interface Props {
  state: RoomState;
  meId: string;
  onLeave?: () => void;
}

export default function GameView({ state, meId, onLeave }: Props) {
  const { phase, revealAt, clue, lastResult, isPaused, hostId } = state;

  const [revealed, setRevealed] = useState(false);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [shotClock, setShotClock] = useState(ROUND_MS);
  const [myPick, setMyPick] = useState<SearchablePlayer | null>(null);
  const revealMark = useRef(0);
  const frozenCountdown = useRef<number | null>(null);
  const frozenShotClock = useRef(ROUND_MS);
  const pauseStartedAt = useRef<number | null>(null);
  const wasPaused = useRef(false);

  const inPlayPhase = phase === "countdown" || phase === "guessing";
  // Host controls pause for the whole room (solo players are always host).
  const canControlPause = meId === hostId && inPlayPhase;

  const togglePause = () => {
    if (!canControlPause) return;
    socket.emit(isPaused ? "resume" : "pause");
  };

  useEffect(() => {
    if (!canControlPause) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      socket.emit(isPaused ? "resume" : "pause");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canControlPause, isPaused]);

  // New round → wipe local round state.
  useEffect(() => {
    setRevealed(false);
    setMyPick(null);
    setCountdownNum(null);
    frozenCountdown.current = null;
    frozenShotClock.current = ROUND_MS;
  }, [state.roundNumber]);

  // Freeze/unfreeze client clocks when server pause toggles.
  useEffect(() => {
    if (isPaused && !wasPaused.current) {
      if (!revealed && countdownNum !== null) frozenCountdown.current = countdownNum;
      if (revealed && phase !== "result") {
        frozenShotClock.current = shotClock;
        pauseStartedAt.current = performance.now();
      }
    }
    if (!isPaused && wasPaused.current) {
      if (pauseStartedAt.current !== null && revealed) {
        revealMark.current += performance.now() - pauseStartedAt.current;
      }
      pauseStartedAt.current = null;
      frozenCountdown.current = null;
    }
    wasPaused.current = isPaused;
  }, [isPaused, revealed, phase, countdownNum, shotClock]);

  // Schedule the reveal at the server-synchronized instant.
  useEffect(() => {
    if (revealAt == null || isPaused) return;
    const remaining = revealAt - serverNow();
    if (remaining <= 0) {
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
  }, [revealAt, state.roundNumber, isPaused]);

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
    if (!revealed || phase === "result" || isPaused) return;
    const tick = setInterval(() => {
      setShotClock(Math.max(0, ROUND_MS - (performance.now() - revealMark.current)));
    }, 100);
    return () => clearInterval(tick);
  }, [revealed, phase, isPaused]);

  const answered = myPick !== null || state.answeredIds.includes(meId);
  const skipped = state.skippedIds.includes(meId);

  const onPick = (p: SearchablePlayer) => {
    if (answered || isPaused) return;
    const elapsedMs = Math.round(performance.now() - revealMark.current);
    setMyPick(p);
    socket.emit("submitAnswer", { pickedId: p.id, elapsedMs });
  };

  const pauseOverlay = isPaused && inPlayPhase && (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="Game paused">
      <div className="pause-card">
        <p className="pause-title">TIMEOUT</p>
        <p className="pause-sub">
          {canControlPause ? "Clock stopped. Take a breath." : "Host called a timeout."}
        </p>
        <div className="pause-actions">
          {canControlPause && (
            <button className="btn btn-primary btn-pause-resume" onClick={() => socket.emit("resume")}>
              RESUME
            </button>
          )}
          {onLeave && (
            <button className="btn btn-secondary btn-pause-quit" onClick={onLeave}>
              QUIT
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const pauseBtn = canControlPause && !isPaused && (
    <button className="btn-icon btn-pause" onClick={togglePause} aria-label="Pause game">
      <PauseIcon />
    </button>
  );

  // ---- result --------------------------------------------------------------
  if (phase === "result" && lastResult) {
    const iWon = lastResult.winnerId === meId;
    const soloMode = state.players.length === 1;
    const correct = !!lastResult.winnerId;
    return (
      <main className="game game-playing game-result">
        <div className="game-court">
          <section className="result">
            <div className={`result-banner ${correct ? "result-banner-correct" : "result-banner-missed"}`}>
              <div>
                <p className="result-callout">
                  {soloMode
                    ? correct ? "Bucket!" : "Skipped / Missed"
                    : correct
                      ? iWon ? "Bucket! You buried it" : `${lastResult.winnerNickname} buries it`
                      : "Airball. Nobody got it"}
                </p>
                <p className="result-subhead">
                  {soloMode
                    ? correct ? `Got it${lastResult.winnerElapsedMs != null ? ` · ${lastResult.winnerElapsedMs}ms` : ""}` : "No bucket"
                    : correct && lastResult.winnerElapsedMs != null
                      ? <span className="result-ms">{lastResult.winnerElapsedMs}ms</span>
                      : ""}
                </p>
              </div>
            </div>
            <div className="result-player-card">
              <ClueCard clue={lastResult.clue} imageUrl={lastResult.revealedImageUrl} revealed />
              <div className="result-player-info">
                <p className="result-name">{lastResult.clueName}</p>
                <p className="result-meta">DIFFICULTY {lastResult.difficulty}</p>
              </div>
            </div>
            {!soloMode && (
              <ul className="result-answers">
                {lastResult.answers.map((a) => (
                  <li key={a.playerId} className={a.correct ? "ok" : "miss"}>
                    <span className="result-answer-mark">{a.correct ? "✓" : "✗"}</span>
                    <span className="result-answer-nick">{a.nickname}</span>
                    <span className="result-answer-pick">{a.pickedName}</span>
                    <span className="result-answer-ms">{a.elapsedMs}ms</span>
                  </li>
                ))}
                {lastResult.answers.length === 0 && <li className="miss">no answers came in</li>}
              </ul>
            )}
            {soloMode && (
              <p className="solo-round-counter">
                ROUND {lastResult.roundNumber} OF {state.targetScore}
              </p>
            )}
          </section>
        </div>

        <aside className="game-rail">
          <Scoreboard state={state} meId={meId} />
          <div className="next-round-card">
            <span className="next-round-label">NEXT ROUND</span>
            <div
              className="next-bar next-bar-rail"
              key={`rail-${lastResult.roundNumber}`}
              style={{ "--result-ms": `${RESULT_MS}ms` } as React.CSSProperties}
            />
          </div>
        </aside>
      </main>
    );
  }

  const displayCountdown = isPaused && frozenCountdown.current !== null
    ? frozenCountdown.current
    : countdownNum;
  const displayShotClock = isPaused ? frozenShotClock.current : shotClock;

  // ---- countdown -----------------------------------------------------------
  if (!revealed) {
    return (
      <main className={`game-countdown ${isPaused ? "is-paused" : ""}`}>
        {pauseBtn}
        <section className="countdown">
          <span className="countdown-round">ROUND {state.roundNumber}</span>
          <span className="countdown-num" key={displayCountdown ?? 0}>
            {displayCountdown ?? "…"}
          </span>
          <p className="countdown-hint">EYES UP. HANDS READY.</p>
        </section>
        {pauseOverlay}
      </main>
    );
  }

  // ---- guessing ------------------------------------------------------------
  const timeStr = (displayShotClock / 1000).toFixed(1);
  const lowClock = displayShotClock < 5000 ? "is-low" : "";
  const clockPct = Math.max(0, Math.min(100, (displayShotClock / ROUND_MS) * 100));

  const waitingOn =
    state.players
      .filter((p) => p.connected && !state.answeredIds.includes(p.id) && !state.skippedIds.includes(p.id))
      .map((p) => p.nickname)
      .join(", ") || "the buzzer";

  return (
    <main className={`game game-playing game-guessing ${isPaused ? "is-paused" : ""}`}>
      <div className="game-court">
        <div className="game-meta">
          <span className="round-label">ROUND {state.roundNumber}</span>
          {pauseBtn}
        </div>

        {state.cluePoolRecycled && state.roundNumber > 0 && (
          <p className="recycle-note">fresh clues exhausted, running it back with repeats</p>
        )}

        <section className="play">
          {clue && <ClueCard clue={clue} />}

          <div className="play-controls">
            {answered ? (
              <div className="locked">
                <p className="locked-title">LOCKED IN</p>
                {myPick && <p className="locked-pick">{myPick.name}</p>}
                <p className="locked-wait">waiting on {waitingOn}…</p>
              </div>
            ) : skipped ? (
              <div className="locked">
                <p className="locked-title">SKIPPED</p>
                <p className="locked-wait">waiting on {waitingOn}…</p>
              </div>
            ) : (
              <>
                <PlayerSearch disabled={!revealed || isPaused} onPick={onPick} />
                <button
                  className="btn btn-ghost btn-skip"
                  disabled={isPaused}
                  onClick={() => socket.emit("skipRound")}
                >
                  SKIP →
                </button>
              </>
            )}
          </div>
        </section>
      </div>

      <aside className="game-rail">
        <Scoreboard state={state} meId={meId} />
        <div className={`shotclock-card ${lowClock}`}>
          <span className="shotclock-label">SHOT CLOCK</span>
          <span className={`shot-clock ${lowClock}`}>{timeStr}</span>
          <div className="shotclock-bar">
            <div className="shotclock-bar-fill" style={{ width: `${clockPct}%` }} />
          </div>
        </div>
      </aside>
      {pauseOverlay}
    </main>
  );
}
