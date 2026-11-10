import { QRCodeSVG } from 'qrcode.react'
import Knight from '../game/Knight'
import Goblin from '../game/Goblin'
import Skeleton from '../game/Skeleton'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import PageLayout from '../components/PageLayout'
import MatchStats from '../components/MatchStats'
import { useMatch } from '../hooks/useMatch'
import type { Action } from '../api/matches'

export default function MatchPage({ host = false }: { host?: boolean }) {
  const { code = '' } = useParams()
  const state = useMatch(code.toUpperCase(), host)
  const { match, you, pending, ready, connected, error, send } = state
  const [clock, setClock] = useState(Date.now())
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 100); return () => clearInterval(timer) }, [])
  const player = match?.players.find(p => p.id === you?.id)
  const remaining = match?.deadline ? Math.max(0, Math.ceil((match.deadline - clock) / 1000)) : 0
  const canStart = match && match.players.every(p => p.team) && ['red', 'blue'].every(t => match.players.some(p => p.team === t))
  const character = player?.team ? match?.characters[player.team] : null
  const canTap = ready && !pending && match?.phase === 'combat' && remaining > 0 && character && character.hp > 0 && (match.mode === 'pvp' || character.enemyHp > 0)
  return <PageLayout wide>
    <div className="d-flex justify-content-between align-items-center mb-3"><h1 className="h3">Match {code.toUpperCase()}</h1><Link to={host ? '/' : '/join'}>{host ? 'Dashboard' : 'Join another match'}</Link></div>
    {!connected && <p role="status" className="alert alert-warning">Disconnected. Your match and taps are saved. Reconnecting…</p>}
    {error && <div role="alert" className="alert alert-danger">{error} <button className="btn btn-outline-dark btn-sm" onClick={state.reconnect}>Reconnect</button></div>}
    {!match ? <p>Loading match…</p> : <>
      {match.status === 'lobby' ? <>
        <section className="card card-body mb-3"><div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', alignItems: 'center' }}><div style={{ flex: '1 1 300px' }}><h2 className="h4">Lobby</h2><p>Guests join at <a href="/join">{window.location.origin}/join</a> using <strong>{match.code}</strong> or by scanning the QR Code. Guests do not need an account.</p>
          {host ? <p>You are the host and supervise both teams.</p> : <><p>Nickname: <strong>{player?.name}</strong>. Choose your team:</p><div className="d-flex gap-2">{(['red', 'blue'] as const).map(t => <button key={t} className={`btn ${player?.team === t ? 'btn-dark' : 'btn-outline-dark'}`} disabled={!ready || pending} onClick={() => void send('game:team', { team: t })}>{t} team</button>)}</div></>}
        </div>{host && <div style={{ textAlign: 'center', flexShrink: 0 }}><QRCodeSVG value={`https://mern.alex84plus.xyz/join?code=${encodeURIComponent(match.code)}`} size={180} level="M" marginSize={4} title={`Join lobby ${match.code}`} /></div>}</div></section>
        <div className="row g-3 mb-3">{(['red', 'blue', null] as const).map(t => <section className="col-md-4" key={String(t)}><div className="card card-body"><h2 className="h5 text-capitalize">{t || 'Unassigned'}</h2><ul>{match.players.filter(p => p.team === t).map(p => <li key={p.id}>{p.name}</li>)}</ul></div></section>)}</div>
        {host && <button className="btn btn-dark" disabled={!ready || pending || !canStart} onClick={() => void send('game:start')}>Start game</button>}
        {host && !canStart && <p className="mt-2">At least one guest must join each team, and every guest must choose a team.</p>}
      </> : match.status === 'playing' ? <>
        <h2 className="h4">{match.mode === 'npc' ? `NPC ${match.stage + 1}: ${match.stage === 0 ? 'Goblin' : 'Skeleton'}` : 'Team versus team'} — round {match.round}</h2>
        <p role="status">{match.phase === 'combat' ? `Tap now: ${remaining}s` : match.phase === 'selection' ? `Vote for team equipment: ${remaining}s` : `Next round in ${remaining}s`}</p>
        <div className="row g-3 mb-4">{(['red', 'blue'] as const).map(t => {
          const c = match.characters[t]
          return <section className="col-sm-6" key={t}><div className="card card-body"><h3 className="h5 text-capitalize">{t} team — one shared character</h3>
            <div className="d-flex justify-content-center align-items-center overflow-hidden"><Knight animation={match.phase === 'pause' ? 'attack' : 'idle'} mirrored={match.mode === 'pvp' && t === 'blue'} label={t + ' team character'} />{match.mode === 'npc' && (match.stage === 0 ? <Goblin /> : <Skeleton />)}</div>
            <p>HP: {c?.hp} / {c?.maxHp}</p><progress className="w-100" value={c?.hp || 0} max={c?.maxHp || 100} aria-label={`${t} health`} />
            {match.mode === 'npc' && <p className="mt-2">Enemy HP: {c?.enemyHp}{c?.enemyHp === 0 ? ' — waiting for the other team' : ''}</p>}
            <p>{match.players.filter(p => p.team === t).map(p => p.name).join(', ')}</p>
            <p>Equipment: {c?.items.map(i => i.name).join(', ') || 'None yet'}</p>
          </div></section>
        })}</div>
        {!host && <section className="card card-body mb-3"><h3 className="h5">{player?.name} · {player?.team} team</h3>
          {match.phase === 'selection' ? <><p>One vote per guest. The most votes wins; ties or no votes choose Attack, then Heal, then Block. Selection closes when the timer ends.</p><div className="d-flex flex-wrap gap-2">{(['attack', 'heal', 'block'] as Action[]).map(action => <button className="btn btn-outline-dark" key={action} disabled={!ready || pending || !!player?.vote || remaining === 0} onClick={() => void send('game:vote', { action, stage: match.stage })}>{action === 'attack' ? 'Sword' : action === 'heal' ? 'Healing charm' : 'Shield'}</button>)}</div>{player?.vote && <p>Your vote: {player.vote}</p>}</> : <><div className="d-flex flex-wrap gap-2">{(['attack', 'heal', 'block'] as Action[]).map(action => <button className="btn btn-dark btn-lg flex-fill" key={action} disabled={!canTap} onClick={() => void send('game:tap', { action, round: match.round })}>{action} ({player?.roundClicks[action] || 0})</button>)}</div><p className="mt-2 mb-0">Each accepted tap boosts your team's action. All actions resolve together at the end of the round.</p></>}
        </section>}
      </> : <section className="mb-4"><h2>Match finished</h2><p>{match.result?.winner ? `${match.result.winner.toUpperCase()} team wins!` : 'No winner.'} Reason: {match.result?.reason.replaceAll('-', ' ')}.</p><MatchStats match={match} /></section>}
      {host && match.status !== 'finished' && <button className="btn btn-outline-danger mt-3" disabled={!ready || pending} onClick={() => { if (window.confirm('End this match and save its current statistics?')) void send('game:end') }}>End match and save</button>}
    </>}
  </PageLayout>
}
