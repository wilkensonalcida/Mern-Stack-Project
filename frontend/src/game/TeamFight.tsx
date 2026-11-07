import { useEffect, useState } from 'react'
import PageLayout from '../components/PageLayout'
import type { Lobby, TeamId } from '../socket/lobby'
import { MAX_HP, TURN_SECONDS, endTurn, flipCoin, otherTeam, startFight, tap, type Move, type TurnResult } from './fightRules'
import Knight, { type KnightAnimation } from './Knight'

// How long the coin flip shows before the first turn, and how long the pause after each turn shows what it did.
const FLIP_SECONDS = 3
const PAUSE_SECONDS = 2

const teamNames: Record<TeamId, string> = { red: 'Red team', blue: 'Blue team' }

// The coin flip shows who goes first, a turn takes taps, and the pause shows what the last turn did.
type Phase = 'flip' | 'turn' | 'pause'

type TeamFightProps = {
  lobby: Lobby
  onEndGame: () => void
}

// The host's screen during the fight: the scoreboard on top, the two knights facing off, and the tap buttons at the bottom.
export default function TeamFight({ lobby, onEndGame }: TeamFightProps) {
  const [fight, setFight] = useState(() => startFight(teamSizes(lobby), flipCoin()))
  const [phase, setPhase] = useState<Phase>('flip')
  const [phaseEndsAt, setPhaseEndsAt] = useState(() => Date.now() + FLIP_SECONDS * 1000)
  const [now, setNow] = useState(() => Date.now())
  const over = fight.winner !== null

  // Redraws the countdown ten times a second.
  useEffect(() => {
    if (over) return
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [over])

  // Ends each phase when its time runs out. A turn ends into the pause, and the coin flip and the pause end into the next turn.
  useEffect(() => {
    if (over) return
    const timer = window.setTimeout(() => {
      if (phase === 'turn') {
        setFight(endTurn)
        setPhase('pause')
        setPhaseEndsAt(Date.now() + PAUSE_SECONDS * 1000)
      } else {
        setPhase('turn')
        setPhaseEndsAt(Date.now() + TURN_SECONDS * 1000)
      }
    }, phaseEndsAt - Date.now())
    return () => window.clearTimeout(timer)
  }, [over, phase, phaseEndsAt])

  // The host's buttons tap for whichever team's turn it is, standing in for the players' phones.
  // TODO (API): Phones send each player's taps here, with the player's team, through the socket.
  function handleTap(move: Move) {
    if (phase !== 'turn') return
    setFight(state => tap(state, state.turn, move))
  }

  const secondsLeft = `${Math.max(0, (phaseEndsAt - now) / 1000).toFixed(1)} s`
  const tapping = phase === 'turn' && !over
  let heading = `${teamNames[fight.turn]}'s turn`
  if (fight.winner) heading = `${teamNames[fight.winner]} wins!`
  else if (phase === 'flip') heading = `${teamNames[fight.turn]} won the coin flip`
  else if (phase === 'pause') heading = `${teamNames[fight.turn]} is up next`

  // Knights idle, except a knight that just attacked swings during the pause, and the winner celebrates.
  function animationFor(team: TeamId): KnightAnimation {
    if (fight.winner === team) return 'victory'
    const last = fight.lastTurn
    if (phase === 'pause' && last?.team === team && last.damage + last.blocked > 0) return 'attack'
    return 'idle'
  }

  function renderHp(team: TeamId) {
    const { hp, shield } = fight.knights[team]
    return (
      <>
        <h2 className="h5 mb-2">{teamNames[team]}</h2>
        <div
          className="progress"
          role="progressbar"
          aria-label={`${teamNames[team]} HP`}
          aria-valuenow={hp}
          aria-valuemin={0}
          aria-valuemax={MAX_HP}
          style={{ height: 20 }}
        >
          <div className={`progress-bar ${team === 'red' ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${(hp / MAX_HP) * 100}%` }} />
        </div>
        {/* Rounded up, so a knight still standing never shows 0. */}
        <p className="fw-semibold mt-1 mb-0">{Math.ceil(hp)} / {MAX_HP} HP</p>
        {/* The line stays when empty, so the card doesn't jump as shields come and go. */}
        <p className="text-body-secondary mb-0" style={{ minHeight: '1.5em' }}>{shield > 0 && `Shield ${shield}`}</p>
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
                <h1 className="fs-4 fw-bold mb-1" id="turn-heading">{heading}</h1>
                {!over && <p className="display-6 mb-0" role="timer" aria-label="Seconds left">{secondsLeft}</p>}
              </div>
              <div className="col-md-4 order-3 text-center text-md-end">{renderHp('blue')}</div>
            </div>
          </div>
        </section>

        {/* Says what the last turn did, during the pause and once the fight is won. */}
        <p className="fs-5 text-center mt-3 mb-0" role="status" style={{ minHeight: '1.5em' }}>
          {(phase === 'pause' || over) && fight.lastTurn && describeTurn(fight.lastTurn)}
        </p>

        {/* The knights face off here. Both use Alex's knight for now, so Blue's is the same knight, mirrored. */}
        {/* The losing knight disappears, and its empty spot keeps the winner where it stood. */}
        <section className="flex-grow-1 d-flex align-items-center justify-content-around py-4" aria-label="Arena">
          {(['red', 'blue'] as TeamId[]).map(team => fight.winner && fight.winner !== team
            ? <div style={{ width: 'min(250px, 40vw)', aspectRatio: '1 / 1' }} key={team} />
            : <Knight animation={animationFor(team)} mirrored={team === 'blue'} label={`${teamNames[team]}'s knight`} key={team} />
          )}
        </section>
      </div>

      {/* Stays at the bottom of the screen, like the lobby's bar: End game on the left, and the tap buttons on the right. */}
      <div className="position-fixed bottom-0 start-0 end-0 p-3 bg-body d-flex justify-content-between align-items-center gap-3">
        <button className="btn btn-outline-dark text-nowrap" type="button" onClick={onEndGame}>End game</button>
        <div className="d-flex align-items-center gap-2">
          {tapping && <span className="d-none d-md-inline text-body-secondary text-nowrap me-2">Tapping for {teamNames[fight.turn]}</span>}
          <button className="btn btn-dark" type="button" onClick={() => handleTap('attack')} disabled={!tapping}>Attack</button>
          <button className="btn btn-dark" type="button" onClick={() => handleTap('block')} disabled={!tapping}>Block</button>
          <button className="btn btn-dark" type="button" onClick={() => handleTap('heal')} disabled={!tapping}>Heal</button>
        </div>
      </div>
    </PageLayout>
  )
}

// Players on each team when the fight starts. Players who never picked a team don't count.
function teamSizes(lobby: Lobby): Record<TeamId, number> {
  const count = (team: TeamId) => lobby.players.filter(player => player.team === team).length
  return { red: count('red'), blue: count('blue') }
}

// Puts a turn into words, like "Red team hit Blue team for 20 and healed 5."
function describeTurn(result: TurnResult): string {
  const team = teamNames[result.team]
  const foe = teamNames[otherTeam(result.team)]
  const parts: string[] = []
  if (result.damage > 0) parts.push(`hit ${foe} for ${result.damage}`)
  if (result.healed > 0) parts.push(`healed ${result.healed}`)
  if (result.shield > 0) parts.push(`raised a shield of ${result.shield}`)
  const did = parts.length > 0 ? `${team} ${joinWithAnd(parts)}.` : `${team} didn't land anything.`
  return result.blocked > 0 ? `${did} ${foe}'s shield blocked ${result.blocked}.` : did
}

function joinWithAnd(parts: string[]): string {
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]
}
