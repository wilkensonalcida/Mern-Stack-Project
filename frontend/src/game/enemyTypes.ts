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
  // How long until the next round opens, while one is waiting to.
  nextRoundInMs: number;
  knight: TeamKnight;
  players: EnemyPlayer[];
  lastRound: RoundResult | null;
};
// What the host's screen gets: both teams' fights, each team's taps so far this round, and who has picked an item.
export type TapCounts = { attack: number; block: number; heal: number };
export type HostTeamView = Omit<EnemyState, 'code' | 'players'> & {
  players: { id: string; name: string; picked: boolean }[];
  taps: TapCounts;
};
export type HostBossState = {
  code: string;
  pvpStarted: boolean;
  teams: Record<TeamId, HostTeamView>;
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
