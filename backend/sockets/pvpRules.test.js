import { describe, expect, it } from 'vitest';
import { createKnights, flipCoin, resolveTurn } from './pvpRules.js';

// The 13 team fight tests from frontend/src/game/fightRules.test.ts, ported to the server's
// one knight per team rules, plus the item bonuses and the boss fights' handoff.
const noBonus = { attack: 1, block: 1, heal: 1 };
const handoff = (red = {}, blue = {}) => ({
  knights: {
    red: { hp: 100, maxHp: 100, buffs: noBonus, ...red },
    blue: { hp: 100, maxHp: 100, buffs: noBonus, ...blue },
  },
});
const oneEach = { red: ['rosa'], blue: ['blake'] };

// One turn for the team: taps maps each player to their counts this turn.
function turn(knights, team, taps, roster = oneEach) {
  const tapsById = new Map(Object.entries(taps));
  return resolveTurn(knights, team, tapsById, roster[team]);
}
const attack = n => ({ attack: n, block: 0, heal: 0 });
const block = n => ({ attack: 0, block: n, heal: 0 });
const heal = n => ({ attack: 0, block: 0, heal: n });

describe('PvP', () => {
  it('builds both knights from the boss fights, with their HP, bonuses, and no shields', () => {
    const knights = createKnights(handoff({ hp: 75, buffs: { attack: 1.25, block: 1, heal: 1 } }));
    expect(knights.red).toEqual({ hp: 75, maxHp: 100, shield: 0, buffs: { attack: 1.25, block: 1, heal: 1 } });
    expect(knights.blue).toEqual({ hp: 100, maxHp: 100, shield: 0, buffs: noBonus });
  });

  it('refuses a handoff with a fallen knight or a bad bonus', () => {
    expect(() => createKnights(handoff({ hp: 0 }))).toThrow();
    expect(() => createKnights(handoff({}, { buffs: { attack: -1, block: 1, heal: 1 } }))).toThrow();
    expect(() => createKnights({})).toThrow();
  });

  it('counts an empty team as one player', () => {
    const { knights, result } = turn(createKnights(handoff()), 'blue', {}, { red: ['rosa'], blue: [] });
    expect(result.damage).toBe(0);
    expect(knights.red.hp).toBe(100);
  });

  it('counts taps only from the team on its turn', () => {
    const { result } = turn(createKnights(handoff()), 'red', { rosa: attack(3), blake: attack(5) });
    expect(result.taps).toEqual({ attack: 3, block: 0, heal: 0 });
    expect(result.damage).toBe(6);
  });

  it('takes 2 HP from the other knight per attack tap', () => {
    const { knights } = turn(createKnights(handoff()), 'red', { rosa: attack(10) });
    expect(knights.blue.hp).toBe(80);
  });

  it("divides a team's taps by its players, so a bigger team does not win on numbers", () => {
    const roster = { red: ['rosa', 'kai', 'sam'], blue: ['blake'] };
    const three = turn(createKnights(handoff()), 'red', { rosa: attack(30), kai: attack(30), sam: attack(30) }, roster);
    const one = turn(createKnights(handoff()), 'red', { rosa: attack(30) });
    expect(three.knights.blue.hp).toBe(40);
    expect(one.knights.blue.hp).toBe(40);
  });

  it('keeps HP to one decimal place when taps split unevenly between players', () => {
    const roster = { red: ['rosa', 'kai', 'sam'], blue: ['blake'] };
    const { knights } = turn(createKnights(handoff()), 'red', { rosa: attack(4), kai: attack(3), sam: attack(3) }, roster);
    expect(knights.blue.hp).toBe(93.3);
  });

  it('heals 0.5 HP per tap, but not past full HP', () => {
    let knights = turn(createKnights(handoff()), 'red', { rosa: attack(10) }).knights;
    knights = turn(knights, 'blue', { blake: heal(20) }).knights;
    expect(knights.blue.hp).toBe(90);
    knights = turn(knights, 'blue', { blake: heal(100) }).knights;
    expect(knights.blue.hp).toBe(100);
  });

  it("turns blocks into a shield that soaks up the other team's next attack", () => {
    let knights = turn(createKnights(handoff()), 'red', { rosa: block(10) }).knights;
    expect(knights.red.shield).toBe(5);
    knights = turn(knights, 'blue', { blake: attack(10) }).knights;
    expect(knights.red.hp).toBe(85);
    expect(knights.red.shield).toBe(0);
  });

  it("drops an unused shield after the other team's turn", () => {
    let knights = turn(createKnights(handoff()), 'red', { rosa: block(10) }).knights;
    knights = turn(knights, 'blue', {}).knights;
    expect(knights.red.shield).toBe(0);
    expect(knights.red.hp).toBe(100);
  });

  it('never heals with a shield bigger than the attack', () => {
    let knights = turn(createKnights(handoff()), 'red', { rosa: block(40) }).knights;
    knights = turn(knights, 'blue', { blake: attack(5) }).knights;
    expect(knights.red.hp).toBe(100);
  });

  it('names the winner when a knight reaches 0 HP', () => {
    const { knights, result, winner } = turn(createKnights(handoff({}, { hp: 40 })), 'red', { rosa: attack(25) });
    expect(knights.blue.hp).toBe(0);
    expect(result.damage).toBe(40);
    expect(winner).toBe('red');
    expect(turn(createKnights(handoff()), 'red', { rosa: attack(1) }).winner).toBeNull();
  });

  it('records what each turn did', () => {
    let step = turn(createKnights(handoff()), 'red', { rosa: block(10) });
    expect(step.result).toEqual({ team: 'red', damage: 0, blocked: 0, healed: 0, shield: 5, taps: block(10) });
    step = turn(step.knights, 'blue', { blake: { attack: 10, block: 0, heal: 4 } });
    expect(step.result).toEqual({ team: 'blue', damage: 15, blocked: 5, healed: 0, shield: 0, taps: { attack: 10, block: 0, heal: 4 } });
  });

  it('multiplies each move by the knight item bonuses', () => {
    const knights = createKnights(handoff({ hp: 50, buffs: { attack: 1.5, block: 2, heal: 1.25 } }));
    const { knights: after, result } = turn(knights, 'red', { rosa: { attack: 10, block: 10, heal: 8 } });
    expect(result.damage).toBe(30);
    expect(after.red.shield).toBe(10);
    expect(after.red.hp).toBe(55);
  });

  it('leaves the knights it was given unchanged', () => {
    const knights = createKnights(handoff());
    turn(knights, 'red', { rosa: { attack: 10, block: 10, heal: 10 } });
    expect(knights).toEqual(createKnights(handoff()));
  });

  it('flips a coin for the first turn', () => {
    expect(flipCoin(() => 0.2)).toBe('red');
    expect(flipCoin(() => 0.7)).toBe('blue');
  });
});
