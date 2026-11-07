import PageLayout from '../components/PageLayout'
import type { TeamId } from '../socket/lobby'

// Sample numbers for the layout. The fight's rules replace them.
const sample = {
  turn: 'red' as TeamId,
  secondsLeft: 3.2,
  maxHp: 100,
  hp: { red: 80, blue: 100 } as Record<TeamId, number>,
}

const teamNames: Record<TeamId, string> = { red: 'Red team', blue: 'Blue team' }

// The host's screen during the fight: the scoreboard on top, the two knights facing off, and the tap buttons at the bottom.
export default function TeamFight() {
  function renderHp(team: TeamId) {
    const hp = sample.hp[team]
    return (
      <>
        <h2 className="h5 mb-2">{teamNames[team]}</h2>
        <div
          className="progress"
          role="progressbar"
          aria-label={`${teamNames[team]} HP`}
          aria-valuenow={hp}
          aria-valuemin={0}
          aria-valuemax={sample.maxHp}
          style={{ height: 20 }}
        >
          <div className={`progress-bar ${team === 'red' ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${(hp / sample.maxHp) * 100}%` }} />
        </div>
        <p className="fw-semibold mt-1 mb-0">{hp} / {sample.maxHp} HP</p>
      </>
    )
  }

  return (
    <PageLayout wide>
      {/* Fills the screen above the bar, like the lobby. 3rem is the page's own padding, and 88 pixels leave room for the bar. */}
      <div className="d-flex flex-column" style={{ minHeight: 'calc(100vh - 3rem)', paddingBottom: 88 }}>
        <section className="card" aria-labelledby="turn-heading">
          <div className="card-body py-4">
            {/* Like the lobby's code card: Red at the left edge, Blue at the right, and whose turn it is in the middle. */}
            <div className="row align-items-center row-gap-3">
              <div className="col-md-4 order-2 order-md-1 text-center text-md-start">{renderHp('red')}</div>
              <div className="col-md-4 order-1 order-md-2 text-center">
                <h1 className="fs-4 fw-bold mb-1" id="turn-heading">{teamNames[sample.turn]}'s turn</h1>
                <p className="display-6 mb-0" role="timer" aria-label="Seconds left in the turn">{sample.secondsLeft.toFixed(1)} s</p>
              </div>
              <div className="col-md-4 order-3 text-center text-md-end">{renderHp('blue')}</div>
            </div>
          </div>
        </section>

        {/* The knights face off here. Gray boxes stand in for them until the sprites come in. */}
        <section className="flex-grow-1 d-flex align-items-center justify-content-around py-4" aria-label="Arena">
          {(['red', 'blue'] as TeamId[]).map(team => (
            <div
              className="border rounded bg-body-secondary d-flex align-items-center justify-content-center text-body-secondary"
              style={{ width: 'min(200px, 40vw)', aspectRatio: '1 / 1' }}
              key={team}
            >
              {team === 'red' ? 'Red knight' : 'Blue knight'}
            </div>
          ))}
        </section>
      </div>

      {/* Stays at the bottom of the screen, like the lobby's bar: End game on the left, and the tap buttons on the right. */}
      {/* The tap buttons stand in for the players' phones, so one person can play both teams. */}
      <div className="position-fixed bottom-0 start-0 end-0 p-3 bg-body d-flex justify-content-between align-items-center gap-3">
        <button className="btn btn-outline-dark text-nowrap" type="button">End game</button>
        <div className="d-flex align-items-center gap-2">
          <span className="d-none d-md-inline text-body-secondary text-nowrap me-2">Tapping for {teamNames[sample.turn]}</span>
          <button className="btn btn-dark" type="button">Attack</button>
          <button className="btn btn-dark" type="button">Block</button>
          <button className="btn btn-dark" type="button">Heal</button>
        </div>
      </div>
    </PageLayout>
  )
}
