// End-to-end smoke test: two socket clients play a full game to 5, then
// rematch. The server must run with the answer exposed (test hook):
//   BALLHOG_EXPOSE_ANSWER=1 PORT=3002 npx tsx server/index.ts
//   SMOKE_URL=http://localhost:3002 npx tsx scripts/smoke.ts
// "FAST" answers correctly via debugClueId (falling back to matching the
// placeholder clue's jersey+color); "SLOW" answers wrong.

import { io, type Socket } from "socket.io-client";
import type { RoomState } from "../shared/protocol";
import { CLUE_PLAYERS } from "../server/data";

const URL = process.env.SMOKE_URL ?? "http://localhost:3001";
const fast = io(URL, { transports: ["websocket"] });
const slow = io(URL, { transports: ["websocket"] });

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function ack<T>(socket: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (res: { ok: boolean; data?: T; error?: string }) =>
      res.ok ? resolve(res.data as T) : reject(new Error(res.error))
    );
  });
}

let answeredRound = 0;
let sawRecycleFlagNote = false;
let phaseLog: string[] = [];

async function main() {
  const timeout = setTimeout(() => fail(`timed out. phases seen: ${phaseLog.join(" → ")}`), 120_000);

  const { code } = await ack<{ code: string }>(fast, "create", {
    nickname: "FAST",
    playerId: "smoke-fast",
  });
  console.log(`✓ room created: ${code}`);

  await ack(slow, "join", { code, nickname: "SLOW", playerId: "smoke-slow" });
  console.log("✓ second player joined");

  fast.emit("toggleReady");
  slow.emit("toggleReady");

  let started = false;
  let games = 0;

  fast.on("state", (s: RoomState) => {
    if (phaseLog[phaseLog.length - 1] !== s.phase) phaseLog.push(s.phase);

    if (s.phase === "lobby") {
      const everyoneReady = s.players.length === 2 && s.players.every((p) => p.ready);
      if (everyoneReady && !started) {
        started = true;
        fast.emit("startGame");
        console.log("✓ both ready — tipping off");
      }
      if (games === 1) {
        // back in the lobby after rematch
        if (s.players.some((p) => p.score !== 0)) fail("rematch did not reset scores");
        console.log("✓ rematch reset scores and returned to lobby");
        clearTimeout(timeout);
        process.exit(0);
      }
      return;
    }

    if (s.phase === "countdown" && s.revealAt && s.roundNumber > answeredRound) {
      answeredRound = s.roundNumber;
      const round = s.roundNumber;
      const clue = s.clue!;
      if (s.cluePoolRecycled) sawRecycleFlagNote = true;
      const wait = s.revealAt - Date.now() + 80;
      const answerId =
        s.debugClueId ??
        CLUE_PLAYERS.find((c) => c.jersey === clue.jersey && c.color === clue.color)?.id;
      setTimeout(() => {
        if (!answerId) fail("cannot identify the clue (run server with BALLHOG_EXPOSE_ANSWER=1)");
        const wrongId = answerId === CLUE_PLAYERS[0].id ? CLUE_PLAYERS[1].id : CLUE_PLAYERS[0].id;
        fast.emit("submitAnswer", { pickedId: answerId, elapsedMs: 120 + round });
        slow.emit("submitAnswer", { pickedId: wrongId, elapsedMs: 900 + round });
      }, Math.max(wait, 0));
      return;
    }

    if (s.phase === "result" && s.lastResult && s.lastResult.roundNumber === answeredRound) {
      const r = s.lastResult;
      const fastScore = s.players.find((p) => p.id === "smoke-fast")!.score;
      console.log(
        `  round ${r.roundNumber}: answer was ${r.clueName}, winner=${r.winnerNickname} (${r.winnerElapsedMs}ms) — FAST has ${fastScore}`
      );
      if (r.winnerId !== "smoke-fast") fail("fast correct answer did not win the round");
      return;
    }

    if (s.phase === "gameover" && games === 0) {
      games = 1;
      const champ = s.players.find((p) => p.id === s.gameWinnerId);
      if (champ?.id !== "smoke-fast" || champ.score !== 5) {
        fail(`unexpected champion: ${JSON.stringify(s.players)}`);
      }
      console.log(`✓ game over — ${champ.nickname} wins 5–0`);
      fast.emit("rematch");
    }
  });
}

main().catch((e) => fail(e.message));
