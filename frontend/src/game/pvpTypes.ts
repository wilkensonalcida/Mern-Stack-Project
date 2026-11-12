import type { Buffs, GameResult, Move, TapCounts, TeamId } from './enemyTypes';

export type PvpPhase = 'flip' | 'turn' | 'pause' | 'finished';
// Each team's knight in PvP, carried over from the boss fights. Its shield soaks up the other team's next attack.
export type PvpKnight = {
  hp: number;
  maxHp: number;
  shield: number;
  buffs: Buffs;
};
// What a finished turn did.
export type PvpTurnResult = {
  team: TeamId;
  turnNumber: number;
  // HP the other knight lost.
  damage: number;
  // Damage the other knight's shield soaked up.
  blocked: number;
  // HP the team's own knight gained.
  healed: number;
  // The team's shield for the other team's next turn.
  shield: number;
  taps: TapCounts;
};
export type PvpState = {
  code: string;
  phase: PvpPhase;
  turn: TeamId;
  turnNumber: number;
  endsAt: number | null;
  remainingMs: number;
  knights: Record<TeamId, PvpKnight>;
  // Each team's players' names.
  players: Record<TeamId, string[]>;
  // The taps of the turn in progress.
  taps: TapCounts;
  lastTurn: PvpTurnResult | null;
  winner: TeamId | null;
};
export type PvpStateAck = { success: boolean; state?: PvpState; error?: string };
export type PvpResultAck = { success: boolean; result?: GameResult; error?: string };
export type PvpTapAck = { success: boolean; error?: string; move?: Move };
