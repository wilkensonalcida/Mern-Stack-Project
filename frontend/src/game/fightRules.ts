// The team fight's rules: two teams take turns tapping, and the first knight at 0 HP loses.
// No React, browser, or timer code lives here, so the same rules can run on the host's screen or, later, on the server.
import type { TeamId } from '../socket/lobby'

// The numbers come from Alex's prototype. Tune them here.
export const MAX_HP = 100
export const TURN_SECONDS = 5
export const DAMAGE_PER_TAP = 2
export const HEAL_PER_TAP = 0.5
export const SHIELD_PER_TAP = 0.5

export type Move = 'attack' | 'block' | 'heal'

export type Knight = {
  hp: number
  // Soaks up the other team's next attack, then resets, used or not.
  shield: number
  // The team's players when the fight started, at least 1. A team's taps are divided by it.
  players: number
}

// What a finished turn did, for the screen to show.
export type TurnResult = {
  team: TeamId
  // HP the other knight lost.
  damage: number
  // Damage the other knight's shield soaked up.
  blocked: number
  // HP the team's own knight gained.
  healed: number
  // The team's shield for the other team's next turn.
  shield: number
}

// Plain data, so a socket can carry it.
export type FightState = {
  turn: TeamId
  // Counts from 1.
  turnNumber: number
  // The taps of the turn in progress.
  taps: Record<Move, number>
  knights: Record<TeamId, Knight>
  // Null until the first turn ends.
  lastTurn: TurnResult | null
  winner: TeamId | null
}

export function otherTeam(team: TeamId): TeamId {
  return team === 'red' ? 'blue' : 'red'
}

// Picks the team that taps first.
export function flipCoin(random: () => number = Math.random): TeamId {
  return random() < 0.5 ? 'red' : 'blue'
}

export function startFight(players: Record<TeamId, number>, first: TeamId): FightState {
  const knight = (team: TeamId): Knight => ({ hp: MAX_HP, shield: 0, players: Math.max(1, players[team]) })
  return {
    turn: first,
    turnNumber: 1,
    taps: { attack: 0, block: 0, heal: 0 },
    knights: { red: knight('red'), blue: knight('blue') },
    lastTurn: null,
    winner: null,
  }
}

// Every tap enters here, from the host's buttons now and from the players' phones later.
// A tap from the team that's waiting, or after the fight is won, doesn't count.
export function tap(state: FightState, team: TeamId, move: Move): FightState {
  if (state.winner || team !== state.turn) return state
  return { ...state, taps: { ...state.taps, [move]: state.taps[move] + 1 } }
}

// Ends the turn in progress. Its attacks hit the other knight through that knight's shield,
// its heals restore its own knight, and its blocks become its shield for the other team's next turn.
// The turn then passes to the other team, unless the other knight fell.
export function endTurn(state: FightState): FightState {
  if (state.winner) return state
  const team = state.turn
  const foeTeam = otherTeam(team)
  const own = state.knights[team]
  const foe = state.knights[foeTeam]

  // Taps count per player, so a bigger team doesn't win on numbers alone.
  const perPlayer = (move: Move) => state.taps[move] / own.players
  const attack = perPlayer('attack') * DAMAGE_PER_TAP
  const blocked = Math.min(foe.shield, attack)
  const foeHp = roundToTenth(Math.max(0, foe.hp - (attack - blocked)))
  const ownHp = roundToTenth(Math.min(MAX_HP, own.hp + perPlayer('heal') * HEAL_PER_TAP))
  const shield = roundToTenth(perPlayer('block') * SHIELD_PER_TAP)
  const winner = foeHp === 0 ? team : null

  const knights = {
    [team]: { ...own, hp: ownHp, shield },
    [foeTeam]: { ...foe, hp: foeHp, shield: 0 },
  } as Record<TeamId, Knight>

  return {
    turn: winner ? team : foeTeam,
    turnNumber: winner ? state.turnNumber : state.turnNumber + 1,
    taps: { attack: 0, block: 0, heal: 0 },
    knights,
    lastTurn: {
      team,
      damage: roundToTenth(foe.hp - foeHp),
      blocked: roundToTenth(blocked),
      healed: roundToTenth(ownHp - own.hp),
      shield,
    },
    winner,
  }
}

// Keeps HP and shields to one decimal place, so splitting taps between players can't leave a knight alive on a rounding error.
function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10
}
