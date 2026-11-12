import { describe, expect, it } from 'vitest';
import { describeTurn, listWithCommas } from './pvpText';
import type { PvpTurnResult } from './pvpTypes';

const turn = (result: Partial<PvpTurnResult>): PvpTurnResult => ({
  team: 'red',
  turnNumber: 1,
  damage: 0,
  blocked: 0,
  healed: 0,
  shield: 0,
  taps: { attack: 0, block: 0, heal: 0 },
  ...result,
});

describe('listWithCommas', () => {
  it('joins one, two, and three parts with the serial comma', () => {
    expect(listWithCommas(['hit'])).toBe('hit');
    expect(listWithCommas(['hit', 'healed'])).toBe('hit and healed');
    expect(listWithCommas(['hit', 'healed', 'blocked'])).toBe('hit, healed, and blocked');
  });
});

describe('describeTurn', () => {
  it('names what the turn did, with the serial comma', () => {
    expect(describeTurn(turn({ damage: 20, healed: 2, shield: 3 })))
      .toBe('Red team hit Blue team for 20, healed 2, and raised a shield of 3.');
  });

  it("adds what the other team's shield blocked", () => {
    expect(describeTurn(turn({ team: 'blue', damage: 55, blocked: 5 })))
      .toBe("Blue team hit Red team for 55. Red team's shield blocked 5.");
  });

  it('says when a shield blocked the whole attack', () => {
    expect(describeTurn(turn({ blocked: 4 }))).toBe("Blue team's shield blocked all 4 of Red team's damage.");
  });

  it('says when a turn changed nothing', () => {
    expect(describeTurn(turn({}))).toBe("Red team's turn changed nothing.");
  });

  it('shows one decimal place for uneven amounts', () => {
    expect(describeTurn(turn({ damage: 6.7 }))).toBe('Red team hit Blue team for 6.7.');
  });
});
