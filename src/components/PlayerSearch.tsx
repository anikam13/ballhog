import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchablePlayer } from "../../shared/protocol";

// The full searchable pool (~2k names) fetched once and filtered client-side.
// The pool being huge is the point: the dropdown can't be used to deduce the
// answer, and the clue's identity never reaches the client before the result.
let poolPromise: Promise<SearchablePlayer[]> | null = null;
function fetchPool(): Promise<SearchablePlayer[]> {
  poolPromise ??= fetch("/api/players").then((r) => {
    if (!r.ok) throw new Error("player pool failed to load");
    return r.json();
  });
  return poolPromise;
}

const MAX_RESULTS = 100;
const DEBOUNCE_MS = 120;
// Ignore taps after the finger moves enough to count as a scroll gesture.
const SCROLL_THRESHOLD_PX = 8;
// Fuzzy fallback only when strict matching is sparse (avoids noise on "James", "Smith", etc.).
const FUZZY_STRICT_THRESHOLD = 5;
const FUZZY_MIN_QUERY_LEN = 6;
const FUZZY_MAX_DIST = 2;

// accent-insensitive matching: "doncic" finds "Dončić"
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const SUFFIX_WORDS = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

function searchableWords(foldedName: string): string[] {
  return foldedName
    .split(" ")
    .map((w) => w.replace(/\./g, ""))
    .filter((w) => w.length >= 2 && !SUFFIX_WORDS.has(w));
}

/** Levenshtein distance with early exit once distance exceeds maxDist. */
function levenshtein(a: string, b: string, maxDist: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;

  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > maxDist) return maxDist + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

type FoldedPlayer = { p: SearchablePlayer; f: string };

function strictSearch(folded: FoldedPlayer[], q: string): SearchablePlayer[] {
  const starts: SearchablePlayer[] = [];
  const includes: SearchablePlayer[] = [];
  for (const { p, f } of folded) {
    if (f.split(" ").some((w) => w.startsWith(q)) || f.startsWith(q)) {
      starts.push(p);
    } else if (f.includes(q)) {
      includes.push(p);
    }
  }
  return [...starts, ...includes];
}

function fuzzySearch(
  folded: FoldedPlayer[],
  q: string,
  maxDist: number,
  exclude: Set<string>,
  prefixLen: number
): SearchablePlayer[] {
  const prefix = q.slice(0, prefixLen);
  const hits: { p: SearchablePlayer; dist: number }[] = [];

  for (const { p, f } of folded) {
    if (exclude.has(p.id)) continue;
    let best = maxDist + 1;
    for (const w of searchableWords(f)) {
      if (w.length < q.length - maxDist || w.length > q.length + maxDist) continue;
      if (w.slice(0, prefixLen) !== prefix) continue;
      best = Math.min(best, levenshtein(q, w, maxDist));
      if (best === 0) break;
    }
    if (best <= maxDist) hits.push({ p, dist: best });
  }

  hits.sort((a, b) => a.dist - b.dist || a.p.name.localeCompare(b.p.name));
  return hits.map((h) => h.p);
}

function fuzzyFallback(
  folded: FoldedPlayer[],
  q: string,
  maxDist: number,
  exclude: Set<string>
): SearchablePlayer[] {
  // Tight match first (same opening digraph) to limit noise on short queries.
  const tight = fuzzySearch(folded, q, maxDist, exclude, 2);
  if (tight.length > 0) return tight;
  // Looser single-char prefix for longer queries (e.g. "shrempf" → "schrempf").
  if (q.length < FUZZY_MIN_QUERY_LEN) return [];
  return fuzzySearch(folded, q, Math.min(maxDist, 1), exclude, 1);
}

function searchPlayers(folded: FoldedPlayer[], rawQuery: string): SearchablePlayer[] {
  const q = fold(rawQuery.trim());
  if (q.length < 2) return [];

  const strict = strictSearch(folded, q);
  if (strict.length >= FUZZY_STRICT_THRESHOLD || q.length < FUZZY_MIN_QUERY_LEN) {
    return strict.slice(0, MAX_RESULTS);
  }

  const fuzzy = fuzzyFallback(folded, q, FUZZY_MAX_DIST, new Set(strict.map((p) => p.id)));
  return [...strict, ...fuzzy].slice(0, MAX_RESULTS);
}

interface Props {
  disabled: boolean;
  onPick: (player: SearchablePlayer) => void;
}

export default function PlayerSearch({ disabled, onPick }: Props) {
  const [pool, setPool] = useState<SearchablePlayer[]>([]);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const touchRef = useRef({ y: 0, moved: false });

  useEffect(() => {
    fetchPool().then(setPool).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const folded = useMemo(() => pool.map((p) => ({ p, f: fold(p.name) })), [pool]);

  const results = useMemo(() => searchPlayers(folded, debounced), [folded, debounced]);

  useEffect(() => setCursor(0), [results]);

  const pick = (p: SearchablePlayer) => {
    if (disabled) return;
    setQuery("");
    setDebounced("");
    onPick(p);
  };

  const onResultsPointerDown = (e: React.PointerEvent) => {
    touchRef.current = { y: e.clientY, moved: false };
  };

  const onResultsPointerMove = (e: React.PointerEvent) => {
    if (Math.abs(e.clientY - touchRef.current.y) > SCROLL_THRESHOLD_PX) {
      touchRef.current.moved = true;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      pick(results[cursor]);
    }
  };

  return (
    <div className="search">
      <input
        ref={inputRef}
        className="input search-input"
        placeholder="WHO IS THAT?"
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="go"
      />
      {results.length > 0 && !disabled && (
        <ul
          className="search-results"
          onPointerDown={onResultsPointerDown}
          onPointerMove={onResultsPointerMove}
        >
          {results.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                className={`search-item ${i === cursor ? "is-active" : ""}`}
                onPointerDown={(e) => {
                  e.preventDefault(); // keep input focused on mobile
                }}
                onClick={() => {
                  if (touchRef.current.moved) return;
                  pick(p);
                }}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
