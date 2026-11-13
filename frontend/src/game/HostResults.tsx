import type { Lobby } from '../socket/lobby';
import type { GameResult, Move, TeamId } from './enemyTypes';
import { HostFrame } from './HostFrame';

const teamNames: Record<TeamId, string> = { red: 'Red team', blue: 'Blue team' };
const moveNames: Record<Move, string> = { attack: 'Attack', block: 'Block', heal: 'Heal' };
const teams: TeamId[] = ['red', 'blue'];
const moves: Move[] = ['attack', 'block', 'heal'];

type Props = {
  result: GameResult;
  lobby: Lobby;
  error: string;
  onNewGame: () => void;
};

// The host's screen when the game ends: the winner on a tile in its color, and each team's taps across the game.
export default function HostResults({ result, lobby, error, onNewGame }: Props) {
  const how = result.reason === 'pvp-defeat'
    ? `${teamNames[result.winner]}'s knight won the final fight.`
    : `${teamNames[result.loser]}'s knight fell to a boss.`;

  return (
    <HostFrame>
      <main className="host-results">
        <section className={`host-winner team-${result.winner}`} aria-labelledby="results-heading">
          <h1 id="results-heading">{teamNames[result.winner]} wins!</h1>
          <p>{how}</p>
        </section>

        {result.totals && (
          <div className="host-result-grid">
            {teams.map(team => {
              const taps = result.totals![team];
              const total = taps.attack + taps.block + taps.heal;
              const players = lobby.players.filter(player => player.team === team).map(player => player.name);
              const won = team === result.winner;
              return (
                <section className={`host-card host-result team-${team} ${won ? 'is-winner' : ''}`} key={team} aria-labelledby={`${team}-results`}>
                  <header className="host-card-head">
                    <h2 id={`${team}-results`}>{teamNames[team]}</h2>
                    {won && <span className="host-winner-chip">Winner</span>}
                  </header>
                  <p className="host-players">{players.join(', ') || 'Nobody left'}</p>
                  <p className="host-result-total">{total}</p>
                  <p className="host-result-unit">taps</p>
                  <ul className="host-move-chips" aria-label={`${teamNames[team]}'s taps, by move`}>
                    {moves.map(move => <li className={`move-${move}`} key={move}>{moveNames[move]} {taps[move]}</li>)}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        {error && <p className="host-error" role="alert">{error}</p>}
        <div className="host-results-actions">
          <button className="host-start" type="button" onClick={onNewGame}>New game</button>
        </div>
      </main>
    </HostFrame>
  );
}
