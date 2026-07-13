# Ballhog

**Think you know ball? Prove it.**

Ballhog is a free, browser-based NBA player identification game. See the face, name the hooper - the fastest correct answer wins the round. Play with friends in a shared room or go solo for a knowledge rating from Casual to Savant.

**Live:** [ballhog.app](https://ballhog.app/)

> Independent fan project. Not affiliated with, endorsed by, or sponsored by the NBA, its teams, or players. For ages 13+.

---

## Features

- **Multiplayer rooms** - Create or join with a 4-character code (up to 5 players)
- **Synchronized rounds** - Everyone sees the same clue at the same time with a 20-second shot clock
- **Solo mode** - Ten rounds and a 0-1000 knowledge rating (Casual → Highlights Only → Hooper → Elite → Savant)
- **Era filters** - All eras, pre-2000s, or post-2000s
- **Fuzzy player search** - Autocomplete across thousands of NBA names
- **No accounts** - Nickname + room code in the browser; nothing to download

---

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 18, TypeScript, Vite |
| Backend | Node.js, Express |
| Realtime | Socket.IO |
| Data | Static JSON player pool + headshot images (optional pipeline) |

---

## Quick start

```bash
git clone https://github.com/anikam13/ballhog.git
cd ballhog
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` and `/socket.io` to the Express server on port **3001**.

### Production-style local run

```bash
npm run build
NODE_ENV=production npm start
# → http://localhost:3000 (or PORT)
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Client + server together |
| `npm run build` | Build the Vite SPA to `dist/` |
| `npm start` | Serve API + built client |
| `npx tsx scripts/pipeline.ts` | Build real player data + headshots (~12 min) |

Without running the data pipeline, the server uses placeholder names and jersey/color silhouette clues. See [`scripts/README.md`](scripts/README.md) for pipeline details.

---

## Environment variables

None are required for local play. Optional:

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port (default `3001`) |
| `VITE_GA4_MEASUREMENT_ID` | Google Analytics 4 (build-time) |
| `VITE_META_PIXEL_ID` | Meta Pixel (build-time) |

---

## Project structure

```
ballhog/
├── src/           # React SPA (lobby, game, solo, settings)
├── server/        # Express + Socket.IO game server
├── shared/        # Protocol types and game constants
├── data/          # Player JSON (searchable pool + clue set)
├── public/        # Static assets and headshots
└── scripts/       # Data pipeline, smoke tests, brand assets
```

---

## How to play

1. Enter a nickname and create or join a room (or start solo).
2. When a face drops, type the player's name - first correct answer takes the round.
3. Wrong guesses lock you out for that round; skip if you're unsure.
4. First to the host's win target (3-10 correct) wins. Solo mode ends after 10 rounds with a rating.

Feedback: [Tally form](https://tally.so/r/VLqdDg)

---

## License

No license file is included yet. Original Ballhog design and content belong to the creators. NBA names, marks, and imagery belong to their respective owners.
