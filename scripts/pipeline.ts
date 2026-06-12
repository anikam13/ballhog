// MVP data pipeline — run with: npx tsx scripts/pipeline.ts
//
// Sources (see scripts/README.md for why and how to refresh):
//   1. Basketball-Reference season-totals pages 1990→2026: every player active
//      since 1990 (searchable pool + career stats + headshot slugs).
//   2. MikeYan01/nba2k-player-ratings (GitHub): current-edition 2K ratings
//      scraped from 2kratings.com (which Cloudflare-blocks direct scraping).
//
// Clue set = (2K 70–80 OVR ∩ pool) ∪ era-balanced "rotation player" stats
// proxy (career PPG 6–16, 250+ games) for the pre-2K-data eras, every player
// verified to have a real BR headshot (downloaded to public/headshots/).
//
// BR asks crawlers to stay under ~20 requests/min — keep the delays generous.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const HEADSHOT_DIR = path.join(ROOT, "public", "headshots");

const FIRST_SEASON = 1990; // page NBA_1990 = the 1989-90 season
const LAST_SEASON = 2026;
const PAGE_DELAY_MS = 3500;
const IMAGE_DELAY_MS = 2500;

const PROXY_MIN_GAMES = 250;
const PROXY_PPG_MIN = 6;
const PROXY_PPG_MAX = 16;
// candidates sampled per debut-decade bucket before headshot verification
const PROXY_BUCKETS: Record<string, number> = { "1990s": 35, "2000s": 30, "2010s": 25, "2020s": 10 };
const TWOK_SAMPLE = 55;
const TWOK_MIN = 70;
const TWOK_MAX = 80;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

function seededSample<T>(arr: T[], n: number, rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if ((res.status === 429 || res.status === 403) && attempt === 0) {
      console.warn(`  ${res.status} from ${url} — backing off 60s`);
      await sleep(60_000);
      continue;
    }
    return res;
  }
}

// ---- step 1: Basketball-Reference season pages -----------------------------

interface Career {
  slug: string;
  name: string;
  games: number;
  points: number;
  firstYear: number;
  lastYear: number;
}

function parseSeasonPage(html: string): Map<string, { name: string; games: number; points: number }> {
  // Per (season, slug) keep the row with the most games: traded players have
  // per-team rows plus a 2TM/3TM combined row, and the combined row is the
  // season total — summing all rows would double count.
  const bySlug = new Map<string, { name: string; games: number; points: number }>();
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  for (const [, row] of html.matchAll(rowRe)) {
    const player = row.match(
      /data-append-csv="([a-z0-9.]+)"[^>]*data-stat="name_display"[^>]*>\s*<a[^>]*>([^<]+)</
    );
    if (!player) continue;
    const [, slug, name] = player;
    const games = Number(row.match(/data-stat="games"[^>]*>(\d+)/)?.[1] ?? 0);
    const points = Number(row.match(/data-stat="pts"[^>]*>(\d+)/)?.[1] ?? 0);
    const prev = bySlug.get(slug);
    if (!prev || games > prev.games) bySlug.set(slug, { name, games, points });
  }
  return bySlug;
}

async function fetchCareers(): Promise<Map<string, Career>> {
  const careers = new Map<string, Career>();
  for (let year = FIRST_SEASON; year <= LAST_SEASON; year++) {
    const url = `https://www.basketball-reference.com/leagues/NBA_${year}_totals.html`;
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      console.warn(`  skipping ${year}: HTTP ${res.status}`);
      await sleep(PAGE_DELAY_MS);
      continue;
    }
    const rows = parseSeasonPage(await res.text());
    for (const [slug, r] of rows) {
      const c = careers.get(slug);
      if (c) {
        c.games += r.games;
        c.points += r.points;
        c.lastYear = year;
        c.name = r.name;
      } else {
        careers.set(slug, { slug, ...r, firstYear: year, lastYear: year });
      }
    }
    console.log(`  NBA_${year}: ${rows.size} players (pool now ${careers.size})`);
    await sleep(PAGE_DELAY_MS);
  }
  return careers;
}

// ---- step 2: 2K ratings join ------------------------------------------------

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetch2kBand(): Promise<{ name: string; overall: number }[]> {
  const url =
    "https://raw.githubusercontent.com/MikeYan01/nba2k-player-ratings/master/data/league.json";
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`2K dataset fetch failed: HTTP ${res.status}`);
  const all = (await res.json()) as { name: string; overallAttribute: number }[];
  return all
    .filter((p) => p.overallAttribute >= TWOK_MIN && p.overallAttribute <= TWOK_MAX)
    .map((p) => ({ name: p.name, overall: p.overallAttribute }));
}

// ---- step 3: headshot verify + download -------------------------------------

async function downloadHeadshot(slug: string): Promise<boolean> {
  const url = `https://www.basketball-reference.com/req/202106291/images/headshots/${slug}.jpg`;
  const res = await fetchWithRetry(url);
  if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) return false; // not a plausible photo
  fs.writeFileSync(path.join(HEADSHOT_DIR, `${slug}.jpg`), buf);
  return true;
}

// ---- main --------------------------------------------------------------------

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(HEADSHOT_DIR, { recursive: true });
  const rand = mulberry32(0xba11b0c5);

  console.log(`1/3 fetching ${LAST_SEASON - FIRST_SEASON + 1} BR season pages (~2 min)…`);
  const careers = await fetchCareers();

  console.log("2/3 selecting clue candidates…");
  const band = await fetch2kBand();
  const byNorm = new Map<string, Career[]>();
  for (const c of careers.values()) {
    const k = normalizeName(c.name);
    byNorm.set(k, [...(byNorm.get(k) ?? []), c]);
  }
  const matched: Career[] = [];
  let unmatched = 0;
  for (const p of band) {
    const hits = byNorm.get(normalizeName(p.name));
    if (!hits) {
      unmatched++;
      continue;
    }
    // duplicate names: 2K players are current, prefer the most recent career
    matched.push([...hits].sort((a, b) => b.lastYear - a.lastYear)[0]);
  }
  console.log(`  2K ${TWOK_MIN}–${TWOK_MAX} band: ${band.length} (matched ${matched.length}, unmatched ${unmatched})`);
  const twokPicks = seededSample(matched, TWOK_SAMPLE, rand);
  const twokIds = new Set(twokPicks.map((c) => c.slug));

  const proxyPool = [...careers.values()].filter((c) => {
    const ppg = c.points / Math.max(1, c.games);
    return (
      !twokIds.has(c.slug) &&
      c.games >= PROXY_MIN_GAMES &&
      ppg >= PROXY_PPG_MIN &&
      ppg <= PROXY_PPG_MAX
    );
  });
  const decadeOf = (c: Career) =>
    c.firstYear < 2000 ? "1990s" : c.firstYear < 2010 ? "2000s" : c.firstYear < 2020 ? "2010s" : "2020s";
  const proxyPicks: Career[] = [];
  for (const [decade, count] of Object.entries(PROXY_BUCKETS)) {
    const bucket = proxyPool.filter((c) => decadeOf(c) === decade);
    proxyPicks.push(...seededSample(bucket, count, rand));
    console.log(`  proxy ${decade}: ${bucket.length} eligible, sampled ${Math.min(count, bucket.length)}`);
  }

  const candidates = [
    ...twokPicks.map((c) => ({ ...c, source: "2k" as const })),
    ...proxyPicks.map((c) => ({ ...c, source: "proxy" as const })),
  ];

  console.log(`3/3 verifying + downloading ${candidates.length} headshots (~${Math.round((candidates.length * IMAGE_DELAY_MS) / 60000)} min)…`);
  const clues: object[] = [];
  for (const [i, c] of candidates.entries()) {
    const cached = fs.existsSync(path.join(HEADSHOT_DIR, `${c.slug}.jpg`));
    const ok = cached || (await downloadHeadshot(c.slug));
    if (ok) {
      clues.push({
        id: c.slug,
        name: c.name,
        source: c.source,
        firstYear: c.firstYear,
        lastYear: c.lastYear,
      });
    } else {
      console.log(`  no headshot for ${c.name} (${c.slug}) — dropped`);
    }
    if ((i + 1) % 25 === 0) console.log(`  …${i + 1}/${candidates.length} (${clues.length} kept)`);
    if (!cached) await sleep(IMAGE_DELAY_MS);
  }

  const pool = [...careers.values()]
    .map((c) => ({ id: c.slug, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(path.join(DATA_DIR, "searchable_players.json"), JSON.stringify(pool, null, 1));
  fs.writeFileSync(path.join(DATA_DIR, "clue_players.json"), JSON.stringify(clues, null, 1));
  console.log(`done: pool=${pool.length} players, clues=${clues.length} with verified headshots`);
  if (clues.length < 60) {
    console.warn("warning: fewer than 60 clue players — games may feel repetitive (see plan)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
