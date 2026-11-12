import PageLayout from '../components/PageLayout';
import type { Lobby } from '../socket/lobby';
import type { GameResult, TeamId } from './enemyTypes';

const teamNames: Record<TeamId, string> = { red: 'Red team', blue: 'Blue team' };
const teamText: Record<TeamId, string> = { red: 'text-danger', blue: 'text-primary' };
const teamBorder: Record<TeamId, string> = { red: 'border-danger', blue: 'border-primary' };
const teams: TeamId[] = ['red', 'blue'];

type Props = {
  result: GameResult;
  lobby: Lobby;
  error: string;
  onNewGame: () => void;
};

// The host's screen when the game ends: the winner, and each team's taps across the whole game.
export default function HostResults({ result, lobby, error, onNewGame }: Props) {
  const how = result.reason === 'pvp-defeat'
    ? `${teamNames[result.winner]}'s knight won the final fight.`
    : `${teamNames[result.loser]}'s knight fell to a boss.`;

  return (
    <PageLayout wide>
      <section className="text-center pt-3 pb-4" aria-labelledby="results-heading">
        <h1 className={`display-3 fw-bold mb-2 ${teamText[result.winner]}`} id="results-heading">{teamNames[result.winner]} wins!</h1>
        <p className="fs-4 text-body-secondary mb-0">{how}</p>
      </section>

      {result.totals && (
        <div className="row g-4 justify-content-center">
          {teams.map(team => {
            const taps = result.totals![team];
            const total = taps.attack + taps.block + taps.heal;
            const players = lobby.players.filter(player => player.team === team).map(player => player.name);
            const won = team === result.winner;
            return (
              <div className="col-12 col-md-5" key={team}>
                <section className={`card h-100 text-center ${won ? `border-4 ${teamBorder[team]}` : ''}`} aria-labelledby={`${team}-results`}>
                  <div className="card-body p-4">
                    <h2 className={`h3 mb-1 ${teamText[team]}`} id={`${team}-results`}>{teamNames[team]}</h2>
                    <p className="text-body-secondary mb-3">{players.join(', ') || 'Nobody left'}</p>
                    <p className="display-4 fw-bold mb-0">{total}</p>
                    <p className="fs-5 mb-2">taps</p>
                    <p className="text-body-secondary mb-0">Attack {taps.attack} · Block {taps.block} · Heal {taps.heal}</p>
                  </div>
                </section>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-danger text-center mt-3" role="alert">{error}</p>}
      <div className="text-center mt-4">
        <button className="btn btn-dark btn-lg px-5" type="button" onClick={onNewGame}>New game</button>
      </div>
    </PageLayout>
  );
}
