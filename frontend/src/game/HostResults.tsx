import type { Lobby } from '../socket/lobby';
import type { GameResult, TeamId } from './enemyTypes';
import Knight from './Knight';
import { HostFrame } from './HostFrame';

const teamNames: Record<TeamId, string> = { red: 'Red team', blue: 'Blue team' };
const teams: TeamId[] = ['red', 'blue'];

type Props = {
  result: GameResult;
  lobby: Lobby;
  error: string;
  onNewGame: () => void;
};

// The host's screen when the game ends: the winner's color fills the screen, with its knight in a spotlight,
// and each team's taps across the game in a line below.
export default function HostResults({ result, lobby, error, onNewGame }: Props) {
  const how = result.reason === 'pvp-defeat'
    ? `${teamNames[result.winner]}'s knight won the final fight.`
    : `${teamNames[result.loser]}'s knight fell to a boss.`;

  return (
    <HostFrame team={result.winner}>
      <main className={`stage-results team-${result.winner}`}>
        <h1 id="results-heading">{teamNames[result.winner]} wins!</h1>
        <p className="stage-results-how">{how}</p>
        <div className="stage-spotlight">
          <Knight animation="victory" team={result.winner} mirrored={result.winner === 'blue'} label={`${teamNames[result.winner]}'s knight`} size="82%" />
        </div>
        {result.totals && (
          <ul className="stage-tally" aria-label="Taps across the game">
            {teams.map(team => {
              const taps = result.totals![team];
              const total = taps.attack + taps.block + taps.heal;
              const players = lobby.players.filter(player => player.team === team).map(player => player.name);
              return (
                <li className={`team-${team}`} key={team}>
                  <strong>{teamNames[team]}</strong>
                  <span>{players.join(', ') || 'Nobody left'}</span>
                  <span className="tally-taps">{total} taps</span>
                </li>
              );
            })}
          </ul>
        )}
        {error && <p className="host-error" role="alert">{error}</p>}
        <button className="host-start is-light" type="button" onClick={onNewGame}>New game</button>
      </main>
    </HostFrame>
  );
}
