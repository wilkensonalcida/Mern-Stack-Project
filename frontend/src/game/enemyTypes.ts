export type Move = 'attack' | 'block' | 'heal';
export type TeamId = 'red' | 'blue';
export type Upgrade =
  | 'sharpened_blade'
  | 'heated_blade'
  | 'wood_shield'
  | 'metal_shield'
  | 'healing_potion'
  | 'gauze';
export type UpgradeOption = {
  id: Upgrade;
  name: string;
  stat: Move;
  bonus: number;
  description: string;
};
export type EnemyPhase = 'combat' | 'waiting' | 'selection' | 'ready' | 'failed' | 'won';
export type Buffs = { attack: number; block: number; heal: number };
// Each team fights the bosses with one knight, which its players share.
export type TeamKnight = { hp: number; maxHp: number; buffs: Buffs };
export type EnemyPlayer = {
  id: string;
  name: string;
  team: TeamId;
  selectedUpgrade: Upgrade | null;
  selectionStage: number | null;
  upgradeOptions: UpgradeOption[];
};
export type RoundResult = {
  round: number;
  attack: number;
  blocked: number;
  healed: number;
  enemyDamage: number;
  enemyHp: number;
  knightHp: number;
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
  knight: TeamKnight;
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
  reason: 'enemy-defeat' | 'pvp-defeat';
};
export type Ack = { success: boolean; error?: string };
