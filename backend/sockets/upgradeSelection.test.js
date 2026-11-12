import { describe, expect, it } from 'vitest';
import { applyPick, castVote, decideVote, everyoneVoted, openVote, rollUpgradeOptions, voteCounts } from './upgradeSelection.js';
import { createKnight } from './enemyRules.js';

const offers = [
  { id: 'heated_blade', name: 'Heated Blade', stat: 'attack', bonus: 0.25 },
  { id: 'wood_shield', name: 'Wooden Shield', stat: 'block', bonus: 0.25 },
  { id: 'gauze', name: 'Gauze', stat: 'heal', bonus: 0.25 },
];
const newVote = () => openVote(0, Date.now() + 10_000, offers.map(item => ({ ...item })));

describe('rollUpgradeOptions', () => {
  it('offers three different items', () => {
    const rolled = rollUpgradeOptions(3);
    expect(rolled).toHaveLength(3);
    expect(new Set(rolled.map(item => item.id)).size).toBe(3);
  });
});

describe('castVote', () => {
  it('records a vote for an offered item, and a later vote replaces it', () => {
    const vote = newVote();
    expect(castVote(vote, 'rosa', 'gauze')).toEqual({ success: true, itemId: 'gauze' });
    castVote(vote, 'rosa', 'heated_blade');
    expect(vote.votes.get('rosa')).toBe('heated_blade');
    expect(vote.votes.size).toBe(1);
  });

  it('refuses an item that is not on offer', () => {
    const vote = newVote();
    expect(castVote(vote, 'rosa', 'metal_shield').success).toBe(false);
    expect(vote.votes.size).toBe(0);
  });

  it('refuses votes once the vote has closed', () => {
    const vote = newVote();
    vote.closed = true;
    expect(castVote(vote, 'rosa', 'gauze').success).toBe(false);
  });
});

describe('voteCounts and everyoneVoted', () => {
  it('count only the players still on the team', () => {
    const vote = newVote();
    castVote(vote, 'rosa', 'gauze');
    castVote(vote, 'kai', 'gauze');
    castVote(vote, 'left', 'heated_blade');
    expect(voteCounts(vote, ['rosa', 'kai'])).toEqual({ heated_blade: 0, wood_shield: 0, gauze: 2 });
    expect(everyoneVoted(vote, ['rosa', 'kai'])).toBe(true);
    expect(everyoneVoted(vote, ['rosa', 'kai', 'sam'])).toBe(false);
  });
});

describe('decideVote', () => {
  it('picks the item with the most votes', () => {
    const vote = newVote();
    castVote(vote, 'rosa', 'wood_shield');
    castVote(vote, 'kai', 'wood_shield');
    castVote(vote, 'sam', 'gauze');
    expect(decideVote(vote, ['rosa', 'kai', 'sam'], () => 0)).toBe('wood_shield');
  });

  it('breaks a tie at random among the tied items only', () => {
    const vote = newVote();
    castVote(vote, 'rosa', 'heated_blade');
    castVote(vote, 'kai', 'gauze');
    const sizes = [];
    const picks = [0, 1].map(index => decideVote(vote, ['rosa', 'kai'], size => { sizes.push(size); return index; }));
    expect(sizes).toEqual([2, 2]);
    expect(picks).toEqual(['heated_blade', 'gauze']);
  });

  it('picks at random among all three offers when nobody voted', () => {
    const vote = newVote();
    let size = 0;
    expect(decideVote(vote, ['rosa'], n => { size = n; return 2; })).toBe('gauze');
    expect(size).toBe(3);
  });

  it('ignores the votes of players who left', () => {
    const vote = newVote();
    castVote(vote, 'left', 'heated_blade');
    castVote(vote, 'left2', 'heated_blade');
    castVote(vote, 'rosa', 'gauze');
    expect(decideVote(vote, ['rosa'], () => 0)).toBe('gauze');
  });
});

describe('applyPick', () => {
  it('adds the item bonus to the knight multiplier for its move', () => {
    const knight = createKnight();
    applyPick(knight, 'heated_blade');
    applyPick(knight, 'heated_blade');
    applyPick(knight, 'gauze');
    expect(knight.buffs).toEqual({ attack: 1.5, block: 1, heal: 1.25 });
  });

  it('refuses an unknown item', () => {
    expect(() => applyPick(createKnight(), 'rubber_chicken')).toThrow();
  });
});
