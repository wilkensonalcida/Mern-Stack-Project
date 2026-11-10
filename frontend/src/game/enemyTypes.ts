export type Move = 'attack' | 'block' | 'heal';
export type Upgrade = Move;
export type TeamId = 'red' | 'blue';
export type EnemyPhase = 'combat' | 'waiting' | 'selection' | 'ready' | 'failed' | 'won';
export type Buffs = { attack: number; block: number; heal: number };
export type EnemyPlayer = {
  id: string;
  name: string;
  team: TeamId;
  hp: number;
  maxHp: number;
  buffs: Buffs;
  selected: boolean;
};
export type RoundResult = {
  round: number;
  attack: number;
  enemyDamage: number;
  enemyHp: number;
  playerEffects: { id: string; blocked: number; healed: number; hp: number }[];
};
export type EnemyState = {
  code: string;
  team: TeamId;
  phase: EnemyPhase;
  stage: number;
  enemy: { name: string; hp: number; maxHp: number; damage: number } | null;
  round: number;
  endsAt: number | null;
  remainingMs: number;
  players: EnemyPlayer[];
  lastRound: RoundResult | null;
};
export type PvpPlayer = {
  id: string;
  name: string;
  team: TeamId;
  hp: number;
  maxHp: number;
  buffs: Buffs;
};
export type PvpReady = { code: string; players: PvpPlayer[] };
export type GameResult = {
  code: string;
  winner: TeamId;
  loser: TeamId;
  reason: 'enemy-defeat';
};
export type Ack = { success: boolean; error?: string };
