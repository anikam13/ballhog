// Player data. Real data (from scripts/pipeline.ts → data/*.json +
// public/headshots/) is used when present; otherwise falls back to a
// deterministic placeholder generator so the app always runs.
// Clue players are never identified to clients before the round result.

import fs from "node:fs";
import path from "node:path";
import type { SearchablePlayer } from "../shared/protocol";

export interface CluePlayer {
  id: string;
  name: string;
  difficulty: number; // 0-100; higher = harder; never sent to clients pre-reveal
  /** Real data: a verified headshot exists at public/headshots/{id}.jpg. */
  hasImage?: boolean;
  /** Placeholder data: silhouette dressing. */
  jersey?: number;
  color?: string;
  colorName?: string;
}

export interface CluePlayerRaw {
  id: string;
  name: string;
  source: string;
  firstYear: number;
  lastYear: number;
}

export interface PlayerOverride {
  approved?: boolean;
  difficulty?: number;
}

export type PlayerOverrides = Record<string, PlayerOverride>;

export interface ReviewPlayer {
  id: string;
  name: string;
  source: string;
  firstYear: number;
  lastYear: number;
  computedDifficulty: number;
  difficulty: number;
  headshotUrl: string;
  override: PlayerOverride | null;
}

export function computeDifficulty(c: { firstYear: number; lastYear: number; source: string }): number {
  const era = Math.max(0, (2020 - c.firstYear) / 30) * 60;
  const recency = Math.max(0, (2020 - c.lastYear) / 10) * 25;
  const src = c.source === "proxy" ? 15 : 0;
  return Math.round(Math.min(100, era + recency + src));
}

// mulberry32 — tiny seeded PRNG, good enough for deterministic placeholder data
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Marcus", "Darius", "Jalen", "Tyrese", "DeShawn", "Antoine", "Kendrick", "Maurice",
  "Terrell", "Jamal", "Devin", "Rashard", "Cory", "Brandon", "Isaiah", "Xavier",
  "Quincy", "Donte", "Malik", "Theo", "Reggie", "Vince", "Otis", "Cedric",
  "Lamond", "Trevor", "Khalid", "Ronnie", "Speedy", "Bobby", "Earl", "Wesley",
  "Jarrett", "Damon", "Calbert", "Lindsey", "Anfernee", "Hubert", "Voshon", "Samaki",
  "Erick", "Lorenzen", "Rodrick", "Keyon", "Stromile", "Eddie", "Trajan", "Mateen",
  "Desmond", "Quentin", "Jamaal", "Morris", "Casey", "Fred", "Travis", "Austin",
  "Dion", "Kelvin", "Mario", "Luther", "Greg", "Carlos", "Victor", "Andre",
  "Juwan", "Glenn", "Pooh", "Mookie", "Rex", "Dell",
] as const;

const LAST = [
  "Washington", "Carter", "Hollins", "Brooks", "Mason", "Pierce", "Granger", "Watts",
  "Battle", "Childs", "Strickland", "Mercer", "Hawkins", "Delk", "Knight", "Posey",
  "Augmon", "Caffey", "Rider", "Outlaw", "Wells", "Person", "Threatt", "Chapman",
  "Gugliotta", "Cassell", "Blaylock", "Marbury", "Hornacek", "Starks", "Oakley", "Salley",
  "Bowen", "Foyle", "Jamison", "Henderson", "Whitfield", "Bibby", "Stoudamire", "Abdur",
  "Vaughn", "Geiger", "Perdue", "Longley", "Wennington", "Kukoc", "Divac", "Eaton",
  "Sprewell", "Ceballos", "Campbell", "Elie", "Maxwell", "Tisdale", "Schrempf", "Dumars",
  "Aguirre", "Rodman", "Laimbeer", "Mahorn", "Dantley", "Tripucka", "Lanier", "Bing",
  "Mokeski", "Sikma", "Pressey", "Cummings", "Lister", "Breuer", "Moncrief", "Winters",
  "Bridgeman", "Catchings", "Meyers", "Buckner", "Hodges", "Pierce-Jones", "Grant", "Webb",
] as const;

const COLORS: { hex: string; name: string }[] = [
  { hex: "#C8102E", name: "RED" },
  { hex: "#1D428A", name: "ROYAL" },
  { hex: "#FDB927", name: "GOLD" },
  { hex: "#552583", name: "PURPLE" },
  { hex: "#007A33", name: "GREEN" },
  { hex: "#CE1141", name: "CRIMSON" },
  { hex: "#00538C", name: "NAVY" },
  { hex: "#E56020", name: "SUNSET" },
  { hex: "#98002E", name: "WINE" },
  { hex: "#00788C", name: "TEAL" },
  { hex: "#5A2D81", name: "VIOLET" },
  { hex: "#007AC1", name: "THUNDER" },
];

const POOL_SIZE = 2200;
const CLUE_COUNT = 56;

function generate() {
  const rand = mulberry32(0xba11);
  const seen = new Set<string>();
  const pool: SearchablePlayer[] = [];
  while (pool.length < POOL_SIZE) {
    const name = `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`;
    if (seen.has(name)) continue;
    seen.add(name);
    pool.push({ id: `p${String(pool.length + 1).padStart(4, "0")}`, name });
  }

  // Clue subset: a seeded sample of the pool, each dressed with jersey + color.
  const indices = pool.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const clues: CluePlayer[] = indices.slice(0, CLUE_COUNT).map((idx) => {
    const color = COLORS[Math.floor(rand() * COLORS.length)];
    // Placeholder clues have no real era data — assign mid-range difficulty.
    return {
      id: pool[idx].id,
      name: pool[idx].name,
      difficulty: Math.round(rand() * 60 + 20),
      jersey: Math.floor(rand() * 56),
      color: color.hex,
      colorName: color.name,
    };
  });

  return { pool, clues, rawClues: null as CluePlayerRaw[] | null };
}

const ROOT = path.join(import.meta.dirname, "..");
export const HEADSHOT_DIR = path.join(ROOT, "public", "headshots");
const OVERRIDES_PATH = path.join(ROOT, "data", "player_overrides.json");

function loadOverrides(): PlayerOverrides {
  try {
    return JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
  } catch {
    return {};
  }
}

let playerOverrides = loadOverrides();

function hasHeadshot(id: string): boolean {
  return fs.existsSync(path.join(HEADSHOT_DIR, `${id}.jpg`));
}

function buildCluesFromRaw(raw: CluePlayerRaw[], overrides: PlayerOverrides): CluePlayer[] {
  return raw
    .filter((c) => hasHeadshot(c.id))
    .filter((c) => overrides[c.id]?.approved !== false)
    .map((c) => {
      const computed = computeDifficulty(c);
      const o = overrides[c.id];
      return {
        id: c.id,
        name: c.name,
        hasImage: true,
        difficulty: o?.difficulty ?? computed,
      };
    });
}

function loadReal(): { pool: SearchablePlayer[]; clues: CluePlayer[]; rawClues: CluePlayerRaw[] } | null {
  try {
    const pool: SearchablePlayer[] = JSON.parse(
      fs.readFileSync(path.join(ROOT, "data", "searchable_players.json"), "utf8")
    );
    const raw: CluePlayerRaw[] = JSON.parse(
      fs.readFileSync(path.join(ROOT, "data", "clue_players.json"), "utf8")
    );
    const clues = buildCluesFromRaw(raw, playerOverrides);
    if (pool.length < 100 || clues.length < 10) return null;
    return { pool, clues, rawClues: raw };
  } catch {
    return null;
  }
}

const real = loadReal();
const generated = real ? null : generate();
const { pool, clues: initialClues, rawClues } = real ?? {
  pool: generated!.pool,
  clues: generated!.clues,
  rawClues: generated!.rawClues,
};

/** Mutable — rebuilt when dev overrides are saved. */
export const CLUE_PLAYERS: CluePlayer[] = [...initialClues];

function rebuildCluePlayers() {
  if (!rawClues) return;
  const next = buildCluesFromRaw(rawClues, playerOverrides);
  CLUE_PLAYERS.length = 0;
  CLUE_PLAYERS.push(...next);
}

console.log(
  real
    ? `[ballhog] real data: ${pool.length} searchable, ${CLUE_PLAYERS.length} clue players with headshots`
    : "[ballhog] placeholder data (run \`npx tsx scripts/pipeline.ts\` to build the real set)"
);

export const SEARCHABLE_POOL: SearchablePlayer[] = pool;
export const NAME_BY_ID = new Map(pool.map((p) => [p.id, p.name]));

export function getPlayerOverrides(): PlayerOverrides {
  return playerOverrides;
}

export function getReviewPlayers(): ReviewPlayer[] {
  if (!rawClues) {
    return CLUE_PLAYERS.map((c) => ({
      id: c.id,
      name: c.name,
      source: "placeholder",
      firstYear: 2000,
      lastYear: 2010,
      computedDifficulty: c.difficulty,
      difficulty: playerOverrides[c.id]?.difficulty ?? c.difficulty,
      headshotUrl: `/headshots/${c.id}.jpg`,
      override: playerOverrides[c.id] ?? null,
    }));
  }

  return rawClues
    .filter((c) => hasHeadshot(c.id))
    .map((c) => {
      const computed = computeDifficulty(c);
      const o = playerOverrides[c.id];
      return {
        id: c.id,
        name: c.name,
        source: c.source,
        firstYear: c.firstYear,
        lastYear: c.lastYear,
        computedDifficulty: computed,
        difficulty: o?.difficulty ?? computed,
        headshotUrl: `/headshots/${c.id}.jpg`,
        override: o ?? null,
      };
    });
}

export function savePlayerOverride(id: string, patch: PlayerOverride): void {
  const prev = playerOverrides[id] ?? {};
  const next: PlayerOverride = { ...prev };
  if (patch.approved !== undefined) next.approved = patch.approved;
  if (patch.difficulty !== undefined) next.difficulty = patch.difficulty;

  const merged = { ...playerOverrides, [id]: next };
  playerOverrides = merged;
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(playerOverrides, null, 2) + "\n");
  rebuildCluePlayers();
}
