import { describe, expect, it } from 'vitest'
import type { TeamId } from '../socket/lobby'
import { MAX_HP, endTurn, flipCoin, startFight, tap, type FightState, type Move } from './fightRules'

function tapTimes(state: FightState, team: TeamId, move: Move, times: number): FightState {
  for (let i = 0; i < times; i++) state = tap(state, team, move)
  return state
}

const oneEach = { red: 1, blue: 1 }

describe('the team fight', () => {
  it('starts both knights at full HP, with the first team on its turn', () => {
    const state = startFight(oneEach, 'blue')
    expect(state.turn).toBe('blue')
    expect(state.turnNumber).toBe(1)
    expect(state.knights.red).toEqual({ hp: MAX_HP, shield: 0, players: 1 })
    expect(state.knights.blue).toEqual({ hp: MAX_HP, shield: 0, players: 1 })
    expect(state.winner).toBeNull()
  })

  it('counts an empty team as one player', () => {
    expect(startFight({ red: 2, blue: 0 }, 'red').knights.blue.players).toBe(1)
  })

  it('counts taps only from the team on its turn', () => {
    let state = startFight(oneEach, 'red')
    state = tapTimes(state, 'red', 'attack', 3)
    state = tapTimes(state, 'blue', 'attack', 5)
    expect(state.taps).toEqual({ attack: 3, block: 0, heal: 0 })
  })

  it('takes 2 HP from the other knight per attack tap, then passes the turn', () => {
    let state = tapTimes(startFight(oneEach, 'red'), 'red', 'attack', 10)
    state = endTurn(state)
    expect(state.knights.blue.hp).toBe(80)
    expect(state.turn).toBe('blue')
    expect(state.turnNumber).toBe(2)
    expect(state.taps).toEqual({ attack: 0, block: 0, heal: 0 })
  })

  it('divides a team\'s taps by its players, so a bigger team does not win on numbers', () => {
    const three = endTurn(tapTimes(startFight({ red: 3, blue: 1 }, 'red'), 'red', 'attack', 90))
    const one = endTurn(tapTimes(startFight({ red: 1, blue: 1 }, 'red'), 'red', 'attack', 30))
    expect(three.knights.blue.hp).toBe(40)
    expect(one.knights.blue.hp).toBe(40)
  })

  it('keeps HP to one decimal place when taps split unevenly between players', () => {
    const state = endTurn(tapTimes(startFight({ red: 3, blue: 1 }, 'red'), 'red', 'attack', 10))
    expect(state.knights.blue.hp).toBe(93.3)
  })

  it('heals 0.5 HP per tap, but not past full HP', () => {
    let state = endTurn(tapTimes(startFight(oneEach, 'red'), 'red', 'attack', 10))
    state = endTurn(tapTimes(state, 'blue', 'heal', 20))
    expect(state.knights.blue.hp).toBe(90)
    state = endTurn(state)
    state = endTurn(tapTimes(state, 'blue', 'heal', 100))
    expect(state.knights.blue.hp).toBe(MAX_HP)
  })

  it('turns blocks into a shield that soaks up the other team\'s next attack', () => {
    let state = endTurn(tapTimes(startFight(oneEach, 'red'), 'red', 'block', 10))
    expect(state.knights.red.shield).toBe(5)
    state = endTurn(tapTimes(state, 'blue', 'attack', 10))
    expect(state.knights.red.hp).toBe(85)
    expect(state.knights.red.shield).toBe(0)
  })

  it('drops an unused shield after the other team\'s turn', () => {
    let state = endTurn(tapTimes(startFight(oneEach, 'red'), 'red', 'block', 10))
    state = endTurn(state)
    expect(state.knights.red.shield).toBe(0)
    expect(state.knights.red.hp).toBe(MAX_HP)
  })

  it('never heals with a shield bigger than the attack', () => {
    let state = endTurn(tapTimes(startFight(oneEach, 'red'), 'red', 'block', 40))
    state = endTurn(tapTimes(state, 'blue', 'attack', 5))
    expect(state.knights.red.hp).toBe(MAX_HP)
  })

  it('names the winner when a knight reaches 0 HP, and ignores taps after', () => {
    let state = endTurn(tapTimes(startFight(oneEach, 'red'), 'red', 'attack', 30))
    state = endTurn(state)
    state = endTurn(tapTimes(state, 'red', 'attack', 25))
    expect(state.knights.blue.hp).toBe(0)
    expect(state.lastTurn?.damage).toBe(40)
    expect(state.winner).toBe('red')
    expect(state.turn).toBe('red')
    expect(tap(state, 'red', 'attack')).toBe(state)
    expect(endTurn(state)).toBe(state)
  })

  it('records what each turn did', () => {
    let state = startFight(oneEach, 'red')
    expect(state.lastTurn).toBeNull()
    state = endTurn(tapTimes(state, 'red', 'block', 10))
    expect(state.lastTurn).toEqual({ team: 'red', damage: 0, blocked: 0, healed: 0, shield: 5 })
    state = endTurn(tapTimes(tapTimes(state, 'blue', 'attack', 10), 'blue', 'heal', 4))
    expect(state.lastTurn).toEqual({ team: 'blue', damage: 15, blocked: 5, healed: 0, shield: 0 })
  })

  it('flips a coin for the first turn', () => {
    expect(flipCoin(() => 0.2)).toBe('red')
    expect(flipCoin(() => 0.7)).toBe('blue')
  })
})
