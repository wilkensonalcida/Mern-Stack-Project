import type { TeamId } from './enemyTypes';
import type { PvpTurnResult } from './pvpTypes';

const teamNames: Record<TeamId, string> = { red: 'Red team', blue: 'Blue team' };
// The projector shows whole numbers, so a part of a turn that rounds to 0 is left out.

// Joins parts with the serial comma: "a", "a and b", "a, b, and c".
export function listWithCommas(parts: string[]): string {
  if (parts.length <= 2) return parts.join(' and ');
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

// One line on what a PvP turn did, such as "Red team hit Blue team for 20, healed 2, and raised a shield of 3."
export function describeTurn(turn: PvpTurnResult): string {
  const team = teamNames[turn.team];
  const foe = teamNames[turn.team === 'red' ? 'blue' : 'red'];
  const [damage, healed, shield, blocked] = [turn.damage, turn.healed, turn.shield, turn.blocked].map(Math.round);
  const did: string[] = [];
  if (damage > 0) did.push(`hit ${foe} for ${damage}`);
  if (healed > 0) did.push(`healed ${healed}`);
  if (shield > 0) did.push(`raised a shield of ${shield}`);
  const shieldLine = blocked > 0 ? ` ${foe}'s shield blocked ${blocked}.` : '';
  if (did.length) return `${team} ${listWithCommas(did)}.${shieldLine}`;
  return blocked > 0 ? `${foe}'s shield blocked all ${blocked} of ${team}'s damage.` : `${team}'s turn changed nothing.`;
}
