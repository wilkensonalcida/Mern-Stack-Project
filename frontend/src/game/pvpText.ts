import type { TeamId } from './enemyTypes';
import type { PvpTurnResult } from './pvpTypes';

const teamNames: Record<TeamId, string> = { red: 'Red team', blue: 'Blue team' };
const amount = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

// Joins parts with the serial comma: "a", "a and b", "a, b, and c".
export function listWithCommas(parts: string[]): string {
  if (parts.length <= 2) return parts.join(' and ');
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

// One line on what a PvP turn did, such as "Red team hit Blue team for 20, healed 2, and raised a shield of 3."
export function describeTurn(turn: PvpTurnResult): string {
  const team = teamNames[turn.team];
  const foe = teamNames[turn.team === 'red' ? 'blue' : 'red'];
  const did: string[] = [];
  if (turn.damage > 0) did.push(`hit ${foe} for ${amount(turn.damage)}`);
  if (turn.healed > 0) did.push(`healed ${amount(turn.healed)}`);
  if (turn.shield > 0) did.push(`raised a shield of ${amount(turn.shield)}`);
  const blocked = turn.blocked > 0 ? ` ${foe}'s shield blocked ${amount(turn.blocked)}.` : '';
  if (did.length) return `${team} ${listWithCommas(did)}.${blocked}`;
  return blocked ? `${foe}'s shield blocked all ${amount(turn.blocked)} of ${team}'s damage.` : `${team}'s turn changed nothing.`;
}
