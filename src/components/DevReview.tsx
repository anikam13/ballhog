import { useCallback, useEffect, useMemo, useState } from "react";
import BallMark from "./BallMark";

interface ReviewPlayer {
  id: string;
  name: string;
  source: string;
  firstYear: number;
  lastYear: number;
  computedDifficulty: number;
  difficulty: number;
  headshotUrl: string;
  override: { approved?: boolean; difficulty?: number } | null;
}

type LoadState = "loading" | "disabled" | "ready" | "error";

function isReviewed(p: ReviewPlayer): boolean {
  return p.override !== null;
}

export default function DevReview({ onExit }: { onExit: () => void }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [players, setPlayers] = useState<ReviewPlayer[]>([]);
  const [index, setIndex] = useState(0);
  const [skipReviewed, setSkipReviewed] = useState(true);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [difficulty, setDifficulty] = useState(50);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const queue = useMemo(
    () => (skipReviewed ? players.filter((p) => !isReviewed(p)) : players),
    [players, skipReviewed]
  );

  const current = queue[index] ?? null;
  const reviewedCount = players.filter(isReviewed).length;
  const removedCount = players.filter((p) => p.override?.approved === false).length;
  const keptCount = players.filter((p) => p.override?.approved !== false && isReviewed(p)).length;

  const load = useCallback(async () => {
    setLoadState("loading");
    setError(null);
    try {
      const res = await fetch("/api/dev/review");
      if (res.status === 404) {
        setLoadState("disabled");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ReviewPlayer[];
      setPlayers(data);
      setLoadState("ready");
      setIndex(0);
    } catch (e) {
      setError((e as Error).message);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!current) return;
    const o = current.override;
    setApproved(o?.approved ?? true);
    setDifficulty(o?.difficulty ?? current.computedDifficulty);
  }, [current?.id]);

  useEffect(() => {
    if (!saveNotice) return;
    const t = window.setTimeout(() => setSaveNotice(null), 2200);
    return () => window.clearTimeout(t);
  }, [saveNotice]);

  const saveAndAdvance = async (patch: { approved?: boolean; difficulty?: number }) => {
    if (!current || saving) return;
    const playerId = current.id;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: playerId, ...patch }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setPlayers((prev) => {
        const updated = prev.map((p) =>
          p.id === playerId
            ? {
                ...p,
                override: { ...(p.override ?? {}), ...patch },
                difficulty: patch.difficulty ?? p.difficulty,
              }
            : p
        );
        if (skipReviewed) {
          const nextQueue = updated.filter((p) => !isReviewed(p));
          setIndex((i) => Math.min(i, Math.max(0, nextQueue.length - 1)));
        }
        return updated;
      });
      if (patch.approved === false) {
        setSaveNotice("Removed from clue pool");
      } else if (patch.approved === true) {
        setSaveNotice("Kept in clue pool");
      } else {
        setSaveNotice("Saved");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleKeep = () => {
    setApproved(true);
    void saveAndAdvance({ approved: true, difficulty });
  };

  const handleRemove = () => {
    setApproved(false);
    void saveAndAdvance({ approved: false, difficulty });
  };

  const handleNext = () => {
    if (index < queue.length - 1) setIndex(index + 1);
  };

  const handlePrev = () => {
    if (index > 0) setIndex(index - 1);
  };

  if (loadState === "loading") {
    return (
      <div className="dev-review">
        <div className="boot">
          <BallMark size={52} className="boot-mark" />
          <span className="boot-text">LOADING REVIEW…</span>
        </div>
      </div>
    );
  }

  if (loadState === "disabled") {
    return (
      <div className="dev-review">
        <div className="dev-review-panel">
          <h1 className="dev-review-title">DEV TOOLS UNAVAILABLE</h1>
          <p className="dev-review-muted">
            Player review is only available in local development. Run{" "}
            <code>npm run dev</code> to curate clue players.
          </p>
          <button className="btn btn-secondary" onClick={onExit}>
            BACK
          </button>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="dev-review">
        <div className="dev-review-panel">
          <h1 className="dev-review-title">LOAD FAILED</h1>
          <p className="dev-review-muted">{error}</p>
          <button className="btn btn-secondary" onClick={load}>
            RETRY
          </button>
          <button className="btn btn-ghost" onClick={onExit}>
            BACK
          </button>
        </div>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="dev-review">
        <div className="dev-review-panel">
          <h1 className="dev-review-title">NO PLAYERS</h1>
          <p className="dev-review-muted">No clue players with headshots found.</p>
          <button className="btn btn-secondary" onClick={onExit}>
            BACK
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="dev-review">
        <div className="dev-review-panel">
          <h1 className="dev-review-title">ALL DONE</h1>
          <p className="dev-review-muted">
            Reviewed {reviewedCount} / {players.length} players.
            {removedCount > 0 && (
              <>
                <br />
                {keptCount} kept · {removedCount} removed from games.
              </>
            )}
          </p>
          <p className="dev-review-muted">
            Removals save immediately and apply to new rounds without restarting the server.
            Uncheck SKIP REVIEWED to revisit removed players — they show a REMOVED badge.
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSkipReviewed(false);
              setIndex(0);
            }}
          >
            REVIEW ALL
          </button>
          <button className="btn btn-ghost" onClick={onExit}>
            EXIT
          </button>
        </div>
      </div>
    );
  }

  const position = skipReviewed ? index + 1 : players.indexOf(current) + 1;
  const positionTotal = skipReviewed ? queue.length : players.length;

  return (
    <div className="dev-review">
      <header className="dev-review-header">
        <button className="btn-icon dev-review-back" onClick={onExit} aria-label="Exit review">
          ←
        </button>
        <span className="dev-review-progress">
          {position} / {positionTotal}
          {skipReviewed ? " left" : ""}
        </span>
        <label className="dev-review-skip">
          <input
            type="checkbox"
            checked={skipReviewed}
            onChange={(e) => {
              setSkipReviewed(e.target.checked);
              setIndex(0);
            }}
          />
          SKIP REVIEWED
        </label>
      </header>

      <div className="dev-review-card">
        <img
          className="dev-review-headshot"
          src={current.headshotUrl}
          alt=""
          width={280}
          height={280}
        />
        <h1 className="dev-review-name">{current.name}</h1>
        <p className="dev-review-meta">
          {current.source.toUpperCase()} · {current.firstYear}–{current.lastYear}
        </p>
        <p className="dev-review-meta">
          COMPUTED {current.computedDifficulty}
          {current.override?.difficulty !== undefined &&
            current.override.difficulty !== current.computedDifficulty &&
            ` · OVERRIDE ${current.override.difficulty}`}
        </p>
        {current.override?.approved === false && (
          <span className="dev-review-badge dev-review-badge-remove">REMOVED</span>
        )}
      </div>

      <div className="dev-review-difficulty">
        <label className="dev-review-difficulty-label" htmlFor="difficulty">
          DIFFICULTY <span className="dev-review-difficulty-value">{difficulty}</span>
        </label>
        <input
          id="difficulty"
          className="dev-review-slider"
          type="range"
          min={0}
          max={100}
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
        />
        <div className="dev-review-stepper">
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setDifficulty((d) => Math.max(0, d - 5))}
            disabled={difficulty <= 0}
          >
            −5
          </button>
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setDifficulty((d) => Math.min(100, d + 5))}
            disabled={difficulty >= 100}
          >
            +5
          </button>
        </div>
      </div>

      <div className="dev-review-actions">
        <button
          className="btn btn-go dev-review-keep"
          onClick={handleKeep}
          disabled={saving}
          aria-pressed={approved === true}
        >
          KEEP
        </button>
        <button
          className="btn dev-review-remove"
          onClick={handleRemove}
          disabled={saving}
          aria-pressed={approved === false}
        >
          REMOVE
        </button>
      </div>

      <div className="dev-review-nav">
        <button className="btn btn-ghost btn-small" onClick={handlePrev} disabled={index === 0}>
          PREV
        </button>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => void saveAndAdvance({ approved: approved ?? true, difficulty })}
          disabled={saving}
        >
          SAVE
        </button>
        <button
          className="btn btn-ghost btn-small"
          onClick={handleNext}
          disabled={index >= queue.length - 1}
        >
          NEXT
        </button>
      </div>

      {saveNotice && <div className="dev-review-notice">{saveNotice}</div>}
      {error && <div className="dev-review-error">{error}</div>}
    </div>
  );
}
