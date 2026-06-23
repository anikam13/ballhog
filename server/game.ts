// Authoritative room/game state machine. The server is the single source of
// truth: it picks clues, schedules the synchronized revealAt, validates
// answers, awards points (lowest correct elapsed-ms), and advances rounds.

import {
  COUNTDOWN_MS,
  KNOWLEDGE_START,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RESULT_MS,
  ROUND_MS,
  TARGET_SCORE,
  SOLO_ROUNDS,
  MIN_TARGET_SCORE,
  MAX_TARGET_SCORE,
  type Phase,
  type RoomState,
  type RoundResultInfo,
} from "../shared/protocol";
import path from "node:path";
import type { CluePublic } from "../shared/protocol";
import { CLUE_PLAYERS, HEADSHOT_DIR, NAME_BY_ID, type CluePlayer } from "./data";

interface ServerPlayer {
  id: string;
  nickname: string;
  score: number;
  knowledgeScore: number;
  ready: boolean;
  connected: boolean;
  socketId: string | null;
}

interface Answer {
  playerId: string;
  pickedId: string;
  elapsedMs: number;
  correct: boolean;
  receivedAt: number;
}

interface Room {
  code: string;
  hostId: string;
  isSolo: boolean;
  targetScore: number;
  phase: Phase;
  players: Map<string, ServerPlayer>;
  usedClueIds: Set<string>;
  cluePoolRecycled: boolean;
  currentClue: CluePlayer | null;
  roundNumber: number;
  // Monotonic per-clue counter that never resets — used to address the
  // anonymous clue image so its URL is unique for every round across the
  // room's lifetime. (roundNumber resets each game and would collide on a
  // rematch, letting the browser serve a stale cached headshot.)
  clueSerial: number;
  revealAt: number | null;
  answers: Map<string, Answer>;
  skips: Set<string>;
  lastResult: RoundResultInfo | null;
  gameWinnerId: string | null;
  timer: NodeJS.Timeout | null; // at most one pending transition per room
  emptySince: number | null;
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000;

export type Broadcast = (code: string, state: RoomState) => void;

export class GameManager {
  private rooms = new Map<string, Room>();

  constructor(private broadcast: Broadcast) {
    // Sweep rooms whose every player has been disconnected for a while.
    setInterval(() => {
      for (const room of this.rooms.values()) {
        if (room.emptySince && Date.now() - room.emptySince > EMPTY_ROOM_TTL_MS) {
          this.destroyRoom(room);
        }
      }
    }, 30_000).unref();
  }

  // ---- lifecycle -----------------------------------------------------------

  createRoom(nickname: string, playerId: string, socketId: string, solo = false, targetScore = TARGET_SCORE): Room {
    let code: string;
    do {
      code = Array.from({ length: 4 }, () =>
        CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
      ).join("");
    } while (this.rooms.has(code));

    const room: Room = {
      code,
      hostId: playerId,
      isSolo: solo,
      targetScore: solo
        ? SOLO_ROUNDS
        : Math.min(MAX_TARGET_SCORE, Math.max(MIN_TARGET_SCORE, Math.round(targetScore))),
      phase: "lobby",
      players: new Map(),
      usedClueIds: new Set(),
      cluePoolRecycled: false,
      currentClue: null,
      roundNumber: 0,
      clueSerial: 0,
      revealAt: null,
      answers: new Map(),
      skips: new Set(),
      lastResult: null,
      gameWinnerId: null,
      timer: null,
      emptySince: null,
    };
    this.rooms.set(code, room);
    this.addPlayer(room, nickname, playerId, socketId);
    if (solo) this.autoStartSolo(room);
    return room;
  }

  /** Join (or reconnect — stable per-device playerId) a room. Throws on failure. */
  join(code: string, nickname: string, playerId: string, socketId: string): Room {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error("Room not found. Check the code.");

    const existing = room.players.get(playerId);
    if (existing) {
      // Reconnect: reattach the socket, keep score/ready.
      existing.connected = true;
      existing.socketId = socketId;
      if (nickname) existing.nickname = nickname;
      room.emptySince = null;
      this.push(room);
      return room;
    }

    const activeCount = [...room.players.values()].filter((p) => p.connected).length;
    if (activeCount >= MAX_PLAYERS) throw new Error("Room is full (5 players max).");
    // Mid-game joins are allowed: the newcomer starts at 0 and plays from the
    // current/next round like everyone else.
    this.addPlayer(room, nickname, playerId, socketId);
    return room;
  }

  private addPlayer(room: Room, nickname: string, playerId: string, socketId: string) {
    room.players.set(playerId, {
      id: playerId,
      nickname: nickname.trim().slice(0, 16) || "BALLER",
      score: 0,
      knowledgeScore: KNOWLEDGE_START,
      ready: false,
      connected: true,
      socketId,
    });
    room.emptySince = null;
    this.push(room);
  }

  leave(code: string, playerId: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    room.players.delete(playerId);
    this.afterDeparture(room, playerId);
  }

  handleDisconnect(code: string, playerId: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;
    player.connected = false;
    player.socketId = null;
    // Keep the seat even in the lobby — a backgrounded tab (e.g. the host
    // switching apps to send the invite link) must not destroy the room.
    // Ready gating only counts connected players, and the empty-room sweep
    // reclaims abandoned rooms after EMPTY_ROOM_TTL_MS.
    this.afterDeparture(room, playerId);
  }

  private afterDeparture(room: Room, departedId: string) {
    if (room.players.size === 0) {
      this.destroyRoom(room);
      return;
    }
    const connected = [...room.players.values()].filter((p) => p.connected);
    if (connected.length === 0) {
      room.emptySince = Date.now();
    }
    // Host left/disconnected → promote the first connected player.
    if (room.hostId === departedId || !this.isConnected(room, room.hostId)) {
      room.hostId = (connected[0] ?? [...room.players.values()][0]).id;
    }
    // If everyone still here has answered, don't make them wait out the clock.
    if (room.phase === "guessing") this.maybeFinalizeEarly(room);
    this.push(room);
  }

  private destroyRoom(room: Room) {
    if (room.timer) clearTimeout(room.timer);
    this.rooms.delete(room.code);
  }

  // ---- lobby ---------------------------------------------------------------

  toggleReady(code: string, playerId: string) {
    const room = this.rooms.get(code);
    const player = room?.players.get(playerId);
    if (!room || !player || room.phase !== "lobby") return;
    player.ready = !player.ready;
    this.push(room);
  }

  setTargetScore(code: string, playerId: string, targetScore: number) {
    const room = this.rooms.get(code);
    if (!room || room.phase !== "lobby") return;
    if (playerId !== room.hostId) throw new Error("Only the host can change the win target.");
    const next = Math.round(targetScore);
    if (next < MIN_TARGET_SCORE || next > MAX_TARGET_SCORE) {
      throw new Error(`Correct guesses to win must be between ${MIN_TARGET_SCORE} and ${MAX_TARGET_SCORE}.`);
    }
    room.targetScore = next;
    this.push(room);
  }

  startGame(code: string, playerId: string) {
    const room = this.rooms.get(code);
    if (!room || room.phase !== "lobby") return;
    if (playerId !== room.hostId) throw new Error("Only the host can start the game.");
    const connected = [...room.players.values()].filter((p) => p.connected);
    if (connected.length < MIN_PLAYERS) throw new Error("Need at least 1 player.");
    if (!connected.every((p) => p.ready)) throw new Error("Everyone must ready up first.");
    this.beginGame(room);
  }

  private autoStartSolo(room: Room) {
    const player = room.players.get(room.hostId);
    if (!player) return;
    player.ready = true;
    this.beginGame(room);
  }

  private beginGame(room: Room) {
    // Drop lobby ghosts at tip-off so they don't skew solo detection or hang
    // around the scoreboard all game.
    for (const p of [...room.players.values()]) {
      if (!p.connected) room.players.delete(p.id);
    }
    this.startRound(room);
  }

  rematch(code: string, playerId: string) {
    const room = this.rooms.get(code);
    if (!room || room.phase !== "gameover") return;
    if (playerId !== room.hostId) throw new Error("Only the host can start a rematch.");
    for (const p of room.players.values()) {
      p.score = 0;
      p.knowledgeScore = KNOWLEDGE_START;
      p.ready = false;
    }
    room.phase = "lobby";
    room.roundNumber = 0;
    room.currentClue = null;
    room.revealAt = null;
    room.answers.clear();
    room.lastResult = null;
    room.gameWinnerId = null;
    // usedClueIds intentionally kept: repeat games keep drawing fresh clues
    // until the pool runs dry, then recycle (see pickClue).
    this.push(room);
    if (room.isSolo) this.autoStartSolo(room);
  }

  // ---- rounds --------------------------------------------------------------

  private startRound(room: Room) {
    const clue = this.pickClue(room);
    room.currentClue = clue;
    room.roundNumber += 1;
    room.clueSerial += 1;
    room.revealAt = Date.now() + COUNTDOWN_MS;
    room.answers.clear();
    room.skips.clear();
    room.phase = "countdown";
    this.push(room);

    // Flip to "guessing" at reveal time (clients reveal on their own synced
    // clocks; this keeps server state honest for mid-round joiners), then
    // force-finalize when the shot clock runs out.
    this.setTimer(room, COUNTDOWN_MS, () => {
      if (room.phase !== "countdown") return;
      room.phase = "guessing";
      this.push(room);
      this.setTimer(room, ROUND_MS, () => this.finalizeRound(room));
    });
  }

  private pickClue(room: Room): CluePlayer {
    let unused = CLUE_PLAYERS.filter((c) => !room.usedClueIds.has(c.id));
    if (unused.length === 0) {
      // Ran out of unique clues — reshuffle the whole pool and flag it.
      room.usedClueIds.clear();
      room.cluePoolRecycled = true;
      unused = CLUE_PLAYERS;
    }
    const clue = unused[Math.floor(Math.random() * unused.length)];
    room.usedClueIds.add(clue.id);
    return clue;
  }

  submitAnswer(code: string, playerId: string, pickedId: string, elapsedMs: number) {
    const room = this.rooms.get(code);
    const player = room?.players.get(playerId);
    if (!room || !player || !room.currentClue || !room.revealAt) return;
    if (room.phase !== "guessing" && room.phase !== "countdown") return;
    if (room.answers.has(playerId)) return; // one answer per round

    const now = Date.now();
    if (now < room.revealAt) return; // answered before the reveal? not possible honestly
    // Sanity-clamp the client-reported reaction time (casual trust model, but
    // don't accept values the wall clock proves impossible).
    const maxPlausible = now - room.revealAt + 2000;
    const elapsed = Math.min(Math.max(0, Math.round(elapsedMs)), maxPlausible, ROUND_MS);

    room.answers.set(playerId, {
      playerId,
      pickedId,
      elapsedMs: elapsed,
      correct: pickedId === room.currentClue.id,
      receivedAt: now,
    });
    this.maybeFinalizeEarly(room);
    this.push(room);
  }

  skipRound(code: string, playerId: string) {
    const room = this.rooms.get(code);
    const player = room?.players.get(playerId);
    if (!room || !player || !room.currentClue) return;
    if (room.phase !== "guessing" && room.phase !== "countdown") return;
    if (room.answers.has(playerId) || room.skips.has(playerId)) return;
    room.skips.add(playerId);
    this.maybeFinalizeEarly(room);
    this.push(room);
  }

  private maybeFinalizeEarly(room: Room) {
    if (room.phase !== "guessing" && room.phase !== "countdown") return;
    const connected = [...room.players.values()].filter((p) => p.connected);
    if (connected.length > 0 && connected.every((p) => room.answers.has(p.id) || room.skips.has(p.id))) {
      this.finalizeRound(room);
    }
  }

  private finalizeRound(room: Room) {
    if (room.phase !== "guessing" && room.phase !== "countdown") return;
    const clue = room.currentClue!;

    // Lowest correct elapsed-ms wins; exact ties broken by server receipt order.
    const correct = [...room.answers.values()]
      .filter((a) => a.correct)
      .sort((a, b) => a.elapsedMs - b.elapsedMs || a.receivedAt - b.receivedAt);
    const winner = correct[0] ?? null;

    // Update knowledge scores for all players bidirectionally.
    const gain = Math.max(40, Math.round(clue.difficulty * 1.0));
    // Easy misses still cost the most; hard misses now sting too (old floor was 15 at d=100).
    const penaltyForDiff = (d: number) =>
      Math.max(42, Math.round((100 - d) * 0.5 + d * 0.32));
    for (const [pid, answer] of room.answers) {
      const p = room.players.get(pid);
      if (!p) continue;
      if (answer.correct) {
        p.knowledgeScore = Math.min(1000, p.knowledgeScore + gain);
      } else {
        p.knowledgeScore = Math.max(0, p.knowledgeScore - penaltyForDiff(clue.difficulty));
      }
    }
    for (const pid of room.skips) {
      const p = room.players.get(pid);
      if (p) p.knowledgeScore = Math.max(0, p.knowledgeScore - 10);
    }

    if (winner) {
      const p = room.players.get(winner.playerId);
      if (p) p.score += 1;
    }

    room.lastResult = {
      roundNumber: room.roundNumber,
      clueId: clue.id,
      clueName: clue.name,
      difficulty: clue.difficulty,
      clue: this.cluePublic(room, clue),
      revealedImageUrl: clue.hasImage ? `/headshots/${clue.id}.jpg` : undefined,
      winnerId: winner?.playerId ?? null,
      winnerNickname: winner ? room.players.get(winner.playerId)?.nickname ?? null : null,
      winnerElapsedMs: winner?.elapsedMs ?? null,
      answers: [...room.answers.values()]
        .sort((a, b) => a.elapsedMs - b.elapsedMs)
        .map((a) => ({
          playerId: a.playerId,
          nickname: room.players.get(a.playerId)?.nickname ?? "?",
          pickedName: NAME_BY_ID.get(a.pickedId) ?? "?",
          correct: a.correct,
          elapsedMs: a.elapsedMs,
        })),
    };
    room.currentClue = null;
    room.revealAt = null;

    const isSolo = room.isSolo;
    const soloFinished = isSolo && room.roundNumber >= room.targetScore;
    const champion = !isSolo && [...room.players.values()].find((p) => p.score >= room.targetScore);

    room.phase = "result";
    this.push(room);
    this.setTimer(room, RESULT_MS, () => {
      if (room.phase !== "result") return;
      // If nobody is connected, idle in "result" until someone returns or the
      // empty-room sweep reclaims the room.
      const connected = [...room.players.values()].filter((p) => p.connected);
      if (connected.length === 0) {
        this.setTimer(room, RESULT_MS, () => this.push(room));
        return;
      }
      if (soloFinished || champion) {
        room.phase = "gameover";
        room.gameWinnerId = champion ? champion.id : [...room.players.keys()][0];
        this.push(room);
        return;
      }
      this.startRound(room);
    });
  }

  // ---- plumbing ------------------------------------------------------------

  /** Pre-reveal clue payload — must never identify the player. */
  private cluePublic(room: Room, clue: CluePlayer): CluePublic {
    return clue.hasImage
      ? { imageUrl: `/api/clue/${room.code}/${room.clueSerial}.jpg` }
      : { jersey: clue.jersey, color: clue.color, colorName: clue.colorName };
  }

  /** Resolve the current clue's headshot file for the anonymous image route. */
  clueImagePath(code: string, serial: number): string | null {
    const room = this.rooms.get(code.toUpperCase());
    const clue = room?.currentClue;
    if (!room || !clue?.hasImage || room.clueSerial !== serial) return null;
    if (room.phase !== "countdown" && room.phase !== "guessing") return null;
    return path.join(HEADSHOT_DIR, `${clue.id}.jpg`);
  }

  private isConnected(room: Room, playerId: string) {
    return room.players.get(playerId)?.connected ?? false;
  }

  private setTimer(room: Room, ms: number, fn: () => void) {
    if (room.timer) clearTimeout(room.timer);
    room.timer = setTimeout(fn, ms);
  }

  toPublicState(room: Room): RoomState {
    return {
      code: room.code,
      phase: room.phase,
      isSolo: room.isSolo,
      players: [...room.players.values()].map((p) => ({
        id: p.id,
        nickname: p.nickname,
        score: p.score,
        knowledgeScore: p.knowledgeScore,
        ready: p.ready,
        connected: p.connected,
      })),
      hostId: room.hostId,
      targetScore: room.targetScore,
      roundNumber: room.roundNumber,
      revealAt: room.revealAt,
      clue: room.currentClue ? this.cluePublic(room, room.currentClue) : null,
      // test hook: never set outside BALLHOG_EXPOSE_ANSWER=1 (see scripts/smoke.ts)
      ...(process.env.BALLHOG_EXPOSE_ANSWER === "1" && room.currentClue
        ? { debugClueId: room.currentClue.id }
        : {}),
      lastResult: room.lastResult,
      gameWinnerId: room.gameWinnerId,
      answeredIds: [...room.answers.keys()],
      skippedIds: [...room.skips],
      cluePoolRecycled: room.cluePoolRecycled,
    };
  }

  private push(room: Room) {
    this.broadcast(room.code, this.toPublicState(room));
  }
}
