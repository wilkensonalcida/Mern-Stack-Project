import type { Move, PvpPlayer, TeamId } from './enemyTypes'

// Pure calculation utility for adapting TeamFight to server-driven, per-player actions.
// Existing TeamFight/fightRules does NOT call this automatically.
export type PlayerTaps = { id: string; attack: number; block: number; heal: number }
export type BuffedTotals = { attack: number; block: number; heal: number }
export function buffedTeamTotals(
  team: TeamId,
  players: PvpPlayer[],
  actions: PlayerTaps[],
): BuffedTotals {
  const byId = new Map(actions.map(a => [a.id, a]))
  const members = players.filter(p => p.team === team)
  if (!members.length) return { attack: 0, block: 0, heal: 0 }
  const result = { attack: 0, block: 0, heal: 0 }
  const base: Record<Move, number> = { attack: 2, block: 0.5, heal: 0.5 }
  for (const p of members) {
    const taps = byId.get(p.id)
    if (!taps || p.hp <= 0) continue
    for (const move of ['attack', 'block', 'heal'] as Move[]) {
      result[move] += Math.max(0, taps[move]) * base[move] * p.buffs[move]
    }
  }
  // TeamFight's current game rules divide aggregate taps by the attacking team's size.
  // Preserve that convention after applying each player's individual item bonus.
  return {
    attack: Math.round(result.attack / members.length * 10) / 10,
    block: Math.round(result.block / members.length * 10) / 10,
    heal: Math.round(result.heal / members.length * 10) / 10,
  }
}
 