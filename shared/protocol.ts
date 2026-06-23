// Socket protocol + room state shared by client and server.
// IMPORTANT: nothing in here may leak the current clue's player id/name to
// clients before the round result — the clue is broadcast as number+color only.

export const TARGET_SCORE = 5;
export const MIN_TARGET_SCORE = 3;
export const MAX_TARGET_SCORE = 10;
export const MIN_PLAYERS = 1;
/** Fixed round count for solo games (not user-configurable). */
export const SOLO_ROUNDS = 10;
/** Starting knowledge score — middle of the CASUAL tier (0–199). */
export const KNOWLEDGE_START = 100;
export const MAX_PLAYERS = 5;

/** ms between "round starting" broadcast and the synchronized reveal (3-2-1). */
export const COUNTDOWN_MS = 3500;
/** ms players have to answer after the reveal before the round force-finalizes. */
export const ROUND_MS = 20000;
/** ms the per-round result stays up before the next round auto-starts. */
export const RESULT_MS = 3000;

export type Phase = "lobby" | "countdown" | "guessing" | "result" | "gameover";

export interface PlayerInfo {
  id: string;
  nickname: string;
  score: number;
  ready: boolean;
  connected: boolean;
  knowledgeScore: number;
}

export type KnowledgeTier = "SAVANT" | "ELITE" | "HOOPER" | "HIGHLIGHTS ONLY" | "CASUAL";
export function knowledgeTier(score: number): KnowledgeTier {
  if (score >= 800) return "SAVANT";
  if (score >= 600) return "ELITE";
  if (score >= 400) return "HOOPER";
  if (score >= 200) return "HIGHLIGHTS ONLY";
  return "CASUAL";
}

/**
 * What clients are allowed to see about the clue before the result.
 * Real data: a headshot served via an anonymous per-round URL (never keyed by
 * player id). Placeholder data: jersey number + color on a silhouette.
 */
export interface CluePublic {
  imageUrl?: string;
  jersey?: number;
  color?: string;
  colorName?: string;
}

export interface AnswerInfo {
  playerId: string;
  nickname: string;
  pickedName: string;
  correct: boolean;
  elapsedMs: number;
}

export interface RoundResultInfo {
  roundNumber: number;
  clueId: string;
  clueName: string;
  /** Difficulty of this clue player (0–100). Safe to reveal post-round. */
  difficulty: number;
  clue: CluePublic;
  /** Revealed headshot (id-keyed is fine post-reveal); absent in placeholder mode. */
  revealedImageUrl?: string;
  winnerId: string | null;
  winnerNickname: string | null;
  winnerElapsedMs: number | null;
  answers: AnswerInfo[];
}

export interface RoomState {
  code: string;
  phase: Phase;
  /** True for rooms created via single-player mode — skips the lobby. */
  isSolo: boolean;
  players: PlayerInfo[];
  hostId: string;
  targetScore: number;
  roundNumber: number;
  /** Server epoch ms at which every client reveals the clue. */
  revealAt: number | null;
  clue: CluePublic | null;
  lastResult: RoundResultInfo | null;
  gameWinnerId: string | null;
  /** Who has locked an answer this round (ids only, no correctness). */
  answeredIds: string[];
  /** Who has skipped this round. */
  skippedIds: string[];
  /** True once the unique-clue pool was exhausted and reshuffled. */
  cluePoolRecycled: boolean;
  /** Test-only: current clue id, present only when BALLHOG_EXPOSE_ANSWER=1. */
  debugClueId?: string;
}

/** Searchable pool entry served over GET /api/players (id↔name map for autocomplete). */
export interface SearchablePlayer {
  id: string;
  name: string;
}

export interface JoinPayload {
  code: string;
  nickname: string;
  playerId: string; // stable per-device id (localStorage uuid)
}

export type Ack<T> = (res: { ok: true; data: T } | { ok: false; error: string }) => void;

export interface ClientToServerEvents {
  create: (p: { nickname: string; playerId: string; solo?: boolean; targetScore?: number }, ack: Ack<{ code: string }>) => void;
  join: (p: JoinPayload, ack: Ack<{ code: string }>) => void;
  toggleReady: () => void;
  setTargetScore: (targetScore: number) => void;
  startGame: () => void;
  submitAnswer: (p: { pickedId: string; elapsedMs: number }) => void;
  skipRound: () => void;
  rematch: () => void;
  leave: () => void;
  timesync: (clientTime: number, ack: (serverTime: number) => void) => void;
}

export interface ServerToClientEvents {
  state: (s: RoomState) => void;
  error: (message: string) => void;
}
