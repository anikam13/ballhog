import { io } from "socket.io-client";
import type { RoomState } from "../shared/protocol";

const URL = process.env.SMOKE_URL ?? "http://localhost:3099";
const socket = io(URL, { transports: ["websocket"] });

function ack<T>(event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (res: { ok: boolean; data?: T; error?: string }) =>
      res.ok ? resolve(res.data as T) : reject(new Error(res.error))
    );
  });
}

async function main() {
  let lastState: RoomState | null = null;
  socket.on("state", (s) => {
    lastState = s;
  });

  await new Promise<void>((r) => socket.on("connect", () => r()));
  const { code } = await ack<{ code: string }>("create", { nickname: "HOST", playerId: "host-1" });
  console.log("created", code, "targetScore", lastState?.targetScore);

  socket.emit("setTargetScore", 8);
  await new Promise((r) => setTimeout(r, 100));
  console.log("after setTargetScore(8):", lastState?.targetScore);

  socket.emit("toggleReady");
  socket.emit("startGame");
  await new Promise((r) => setTimeout(r, 100));
  console.log("after start:", lastState?.phase, "targetScore", lastState?.targetScore);

  for (let i = 0; i < 6; i++) {
    while (lastState?.phase !== "countdown" && lastState?.phase !== "guessing") {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (lastState?.debugClueId) {
      socket.emit("submitAnswer", { pickedId: lastState.debugClueId, elapsedMs: 100 });
    }
    while (lastState?.phase !== "result" && lastState?.phase !== "gameover") {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (lastState?.phase === "gameover") {
      console.log(
        "GAME OVER at round",
        lastState.lastResult?.roundNumber,
        "score",
        lastState.players[0].score
      );
      break;
    }
    console.log(
      "round",
      lastState?.lastResult?.roundNumber,
      "score",
      lastState?.players[0].score,
      "target",
      lastState?.targetScore
    );
    await new Promise((r) => setTimeout(r, 6100));
  }

  console.log(
    "final phase:",
    lastState?.phase,
    "score:",
    lastState?.players[0].score,
    "target:",
    lastState?.targetScore
  );
  socket.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
