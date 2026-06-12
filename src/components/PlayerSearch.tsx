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

const MAX_RESULTS = 8;
const DEBOUNCE_MS = 120;

// accent-insensitive matching: "doncic" finds "Dončić"
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

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

  const results = useMemo(() => {
    const q = fold(debounced.trim());
    if (q.length < 2) return [];
    // word-prefix matches first, then substring matches
    const starts: SearchablePlayer[] = [];
    const includes: SearchablePlayer[] = [];
    for (const { p, f } of folded) {
      if (f.split(" ").some((w) => w.startsWith(q)) || f.startsWith(q)) {
        starts.push(p);
      } else if (f.includes(q)) {
        includes.push(p);
      }
      if (starts.length >= MAX_RESULTS) break;
    }
    return [...starts, ...includes].slice(0, MAX_RESULTS);
  }, [folded, debounced]);

  useEffect(() => setCursor(0), [results]);

  const pick = (p: SearchablePlayer) => {
    if (disabled) return;
    setQuery("");
    setDebounced("");
    onPick(p);
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
        <ul className="search-results">
          {results.map((p, i) => (
            <li key={p.id}>
              <button
                className={`search-item ${i === cursor ? "is-active" : ""}`}
                onPointerDown={(e) => {
                  e.preventDefault(); // beat input blur on mobile
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
