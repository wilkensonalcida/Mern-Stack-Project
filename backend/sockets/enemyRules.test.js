import { describe, expect, it } from 'vitest';
import { createKnight, resolveEnemyRound, sumTaps } from './enemyRules.js';

const goblinRound = (tapCounts, playerCount, knight = createKnight()) =>
  resolveEnemyRound({ knight, enemyHp: 100, enemyDamage: 10, tapCounts, playerCount });

describe('createKnight', () => {
  it('starts at full health with no item bonuses', () => {
    expect(createKnight()).toEqual({ hp: 100, maxHp: 100, buffs: { attack: 1, block: 1, heal: 1 } });
  });
});

describe('sumTaps', () => {
  it('adds each move across the team and ignores missing or bad counts', () => {
    expect(sumTaps([
      { attack: 3, block: 1, heal: 0 },
      { attack: 2, heal: 4 },
      undefined,
      { attack: -5, block: 'x', heal: Number.NaN },
    ])).toEqual({ attack: 5, block: 1, heal: 4 });
  });
});

describe('resolveEnemyRound', () => {
  it('averages the taps over the team, so a bigger team taps no harder', () => {
    const solo = goblinRound([{ attack: 10, block: 0, heal: 0 }], 1);
    const pair = goblinRound([{ attack: 10, block: 0, heal: 0 }, { attack: 10, block: 0, heal: 0 }], 2);
    expect(solo.enemyHp).toBe(80);
    expect(pair.enemyHp).toBe(80);
    expect(pair.attack).toBe(20);
  });

  it('counts a team with no players as one, so it never divides by zero', () => {
    expect(goblinRound([{ attack: 10, block: 0, heal: 0 }], 0).enemyHp).toBe(80);
  });

  it('applies the knight item bonuses to each move', () => {
    const knight = { ...createKnight(), hp: 50, buffs: { attack: 1.25, block: 1.5, heal: 1.25 } };
    const round = goblinRound([{ attack: 8, block: 4, heal: 4 }], 1, knight);
    expect(round.attack).toBe(20);
    expect(round.blocked).toBe(6);
    expect(round.healed).toBe(5);
    expect(round.enemyHp).toBe(80);
    expect(round.knight.hp).toBe(51);
  });

  it('blocks no more than the enemy hits for', () => {
    const round = goblinRound([{ attack: 0, block: 50, heal: 0 }], 1);
    expect(round.blocked).toBe(10);
    expect(round.knight.hp).toBe(100);
  });

  it('heals no higher than the knight max HP', () => {
    const knight = { ...createKnight(), hp: 95 };
    const round = goblinRound([{ attack: 0, block: 0, heal: 40 }], 1, knight);
    expect(round.knight.hp).toBe(100);
  });

  it('takes the full hit when the team taps nothing', () => {
    const round = goblinRound([], 3);
    expect(round.knight.hp).toBe(90);
    expect(round.enemyHp).toBe(100);
  });

  it('stops the knight and the enemy at 0 HP', () => {
    const knight = { ...createKnight(), hp: 4 };
    const round = goblinRound([{ attack: 80, block: 0, heal: 0 }], 1, knight);
    expect(round.knight.hp).toBe(0);
    expect(round.enemyHp).toBe(0);
  });

  it('keeps one decimal place when the taps split unevenly', () => {
    const round = goblinRound([{ attack: 10, block: 0, heal: 0 }], 3);
    expect(round.attack).toBe(6.7);
    expect(round.enemyHp).toBe(93.3);
  });

  it('leaves the knight it was given unchanged', () => {
    const knight = createKnight();
    goblinRound([{ attack: 0, block: 0, heal: 0 }], 1, knight);
    expect(knight).toEqual(createKnight());
  });
});
