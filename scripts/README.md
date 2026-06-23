# Data pipeline

`npx tsx scripts/pipeline.ts` builds the real player dataset (~12 min, polite
rate limits). Outputs:

- `data/searchable_players.json` — every player active since 1990 (~2.5k), the
  autocomplete pool. Ids are Basketball-Reference slugs.
- `data/clue_players.json` — the clue set (~140), each with a verified headshot.
- `public/headshots/{slug}.jpg` — downloaded headshots (already-downloaded files
  are skipped on re-runs, so a failed run resumes cheaply).

The server (`server/data.ts`) auto-loads these when present and falls back to
generated placeholder data when absent.

## Sources & why (probed 2026-06-12 — these are fragile, re-verify if broken)

| Need | Source | Notes |
|---|---|---|
| Player pool + stats | basketball-reference.com season-totals pages | stats.nba.com null-routes non-browser traffic (requests hang). BR renders old seasons with modern markup (`data-stat="name_display"` etc.), one parser fits all. Keep ≤20 req/min or get banned. |
| Headshots | BR headshot CDN (`/req/202106291/images/headshots/{slug}.jpg`) | NBA's cdn.nba.com returns a **fallback image with HTTP 200** for missing players (md5 `e7f28497…`), so it can't be verified; BR 404s properly and has photos even for deep 90s bench players. |
| 2K ratings | github.com/MikeYan01/nba2k-player-ratings (`data/league.json`) | 2kratings.com Cloudflare-403s all non-browser clients (TLS fingerprinting — headers don't help). The GitHub mirror covers **one current edition only** (~518 players). |

## Clue selection (MVP hybrid)

The original spec ("rated 70–80 in any NBA 2K") is only computable for current
players. So:

- **2K branch:** 70–80 OVR from the GitHub dataset, name-matched to BR slugs
  (accent/suffix-normalized), sampled to 55.
- **Stats-proxy branch (all eras):** career PPG 6–16 with 250+ games — rotation
  players, "obscure but guessable" — sampled per debut decade
  (35/30/25/10 for 90s/00s/10s/20s).

Candidates without a verifiable BR headshot are dropped. Sampling is seeded, so
re-runs are reproducible. Tune the constants at the top of `pipeline.ts`.

## Refresh

Re-run the script. To force-refresh headshots delete `public/headshots/` first.
If BR markup changes, fix `parseSeasonPage()`; if the 2K repo dies, swap
`fetch2kBand()` to another mirror (HoopsHype publishes current 2K ratings as a
JS-rendered Next.js page).

## Dev player review

Local-only UI at `#dev` (Settings → Player Review) for curating clue players.
Available when running `npm run dev` — no env vars or password required.
Overrides are written to `data/player_overrides.json`.
