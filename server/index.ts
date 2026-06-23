import express from "express";
import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../shared/protocol";
import { SEARCHABLE_POOL } from "./data";
import { GameManager } from "./game";

const PORT = Number(process.env.PORT ?? 3001);
const isProd = process.env.NODE_ENV === "production";

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: true }, // dev: vite proxies /socket.io, but allow direct LAN phones too
});

// In production serve the Vite-built client + public assets (headshots etc.)
if (isProd) {
  app.use(express.static(new URL("../dist", import.meta.url).pathname));
  app.use(express.static(new URL("../public", import.meta.url).pathname));
}

// The id↔name map clients use for autocomplete. Served once over HTTP;
// the clue's identity never rides along before the round result.
const poolJson = JSON.stringify(SEARCHABLE_POOL);
app.get("/api/players", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.type("application/json").send(poolJson);
});

const game = new GameManager((code, state) => {
  io.to(code).emit("state", state);
});

// Current clue headshot, addressed by room + a monotonic clue serial so the
// URL can't identify the player. Cacheable briefly so the countdown preload is
// reused at reveal; the serial is unique per round across the room's whole
// lifetime, so it never collides with a cached image from a previous game.
app.get("/api/clue/:code/:serial.jpg", (req, res) => {
  const file = game.clueImagePath(req.params.code, Number(req.params.serial));
  if (!file) {
    res.status(404).end();
    return;
  }
  res.setHeader("Cache-Control", "private, max-age=300");
  res.sendFile(file);
});

interface SocketSession {
  code: string;
  playerId: string;
}
const sessions = new Map<string, SocketSession>(); // socket.id → membership

function bind(socket: Socket, code: string, playerId: string) {
  const prev = sessions.get(socket.id);
  if (prev && prev.code !== code) socket.leave(prev.code);
  sessions.set(socket.id, { code, playerId });
  socket.join(code);
}

io.on("connection", (socket) => {
  socket.on("create", ({ nickname, playerId, solo, targetScore }, ack) => {
    try {
      const room = game.createRoom(nickname, playerId, socket.id, solo === true, targetScore);
      bind(socket, room.code, playerId);
      // the room broadcast fired before this socket joined the channel
      socket.emit("state", game.toPublicState(room));
      ack({ ok: true, data: { code: room.code } });
    } catch (e) {
      ack({ ok: false, error: (e as Error).message });
    }
  });

  socket.on("join", ({ code, nickname, playerId }, ack) => {
    try {
      const room = game.join(code, nickname, playerId, socket.id);
      bind(socket, room.code, playerId);
      socket.emit("state", game.toPublicState(room));
      ack({ ok: true, data: { code: room.code } });
    } catch (e) {
      ack({ ok: false, error: (e as Error).message });
    }
  });

  socket.on("toggleReady", () => {
    const s = sessions.get(socket.id);
    if (s) game.toggleReady(s.code, s.playerId);
  });

  socket.on("setTargetScore", (targetScore) => {
    const s = sessions.get(socket.id);
    if (!s) return;
    try {
      game.setTargetScore(s.code, s.playerId, targetScore);
    } catch (e) {
      socket.emit("error", (e as Error).message);
    }
  });

  socket.on("startGame", () => {
    const s = sessions.get(socket.id);
    if (!s) return;
    try {
      game.startGame(s.code, s.playerId);
    } catch (e) {
      socket.emit("error", (e as Error).message);
    }
  });

  socket.on("submitAnswer", ({ pickedId, elapsedMs }) => {
    const s = sessions.get(socket.id);
    if (s) game.submitAnswer(s.code, s.playerId, pickedId, elapsedMs);
  });

  socket.on("skipRound", () => {
    const s = sessions.get(socket.id);
    if (s) game.skipRound(s.code, s.playerId);
  });

  socket.on("rematch", () => {
    const s = sessions.get(socket.id);
    if (!s) return;
    try {
      game.rematch(s.code, s.playerId);
    } catch (e) {
      socket.emit("error", (e as Error).message);
    }
  });

  socket.on("leave", () => {
    const s = sessions.get(socket.id);
    if (!s) return;
    sessions.delete(socket.id);
    socket.leave(s.code);
    game.leave(s.code, s.playerId);
  });

  // Clients ping this a few times to estimate server-time offset so every
  // device reveals the clue at the same wall-clock instant.
  socket.on("timesync", (_clientTime, ack) => {
    if (typeof ack === "function") ack(Date.now());
  });

  socket.on("disconnect", () => {
    const s = sessions.get(socket.id);
    if (!s) return;
    sessions.delete(socket.id);
    game.handleDisconnect(s.code, s.playerId);
  });
});

// SPA fallback — must come after all API routes
if (isProd) {
  app.get("*", (_req, res) => {
    res.sendFile(new URL("../dist/index.html", import.meta.url).pathname);
  });
}

httpServer.listen(PORT, () => {
  console.log(`[ballhog] server listening on http://localhost:${PORT}`);
});
