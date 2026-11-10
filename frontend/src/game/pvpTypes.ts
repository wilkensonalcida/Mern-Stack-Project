import type { Buffs, GameResult, Move, TeamId } from './enemyTypes';

export type PvpPhase = 'flip' | 'turn' | 'pause' | 'finished';
export type PvpPlayer = {
  id: string;
  name: string;
  team: TeamId;
  hp: number;
  maxHp: number;
  shield: number;
  buffs: Buffs;
};
export type PvpTurnResult = {
  team: TeamId;
  turnNumber: number;
  attackers: number; // living
  defenders: number;
  totalAttack: number;
  damagePerTarget: number;
  effectiveDamage: number;
  blocked: number;
  healed: number;
  shield: number;
  casualties: string[];
};
export type PvpState = {
  code: string;
  phase: PvpPhase;
  turn: TeamId;
  turnNumber: number;
  endsAt: number | null;
  remainingMs: number;
  players: PvpPlayer[];
  lastTurn: PvpTurnResult | null;
  winner: TeamId | null;
};
export type PvpStateAck = { success: boolean; state?: PvpState; error?: string };
export type PvpResultAck = { success: boolean; result?: GameResult; error?: string };
export type PvpTapAck = { success: boolean; error?: string; move?: Move };
