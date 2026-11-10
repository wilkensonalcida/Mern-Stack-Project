import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { User } from '../api/auth'
import { command, loginToken, getHistory, type Summary } from '../api/matches'
import PageLayout from '../components/PageLayout'

export default function DashboardPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const navigate = useNavigate()
  const requestId = useRef(crypto.randomUUID())
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [matches, setMatches] = useState<Summary[]>([])
  const [page, setPage] = useState(1)
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setHistoryError('')
    getHistory(page).then(data => { if (active) { setMatches(data.matches); setMore(data.hasMore) } })
      .catch(e => { if (active) setHistoryError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, retry])
  async function create() {
    if (creating) return
    setCreating(true); setError('')
    try { const data = await command('game:create', { token: loginToken(), requestId: requestId.current }); navigate(`/host/${data.match.code}`) }
    catch (e) { setError((e as Error).message) }
    finally { setCreating(false) }
  }
  return <PageLayout wide>
    <div className="d-flex justify-content-between align-items-center mb-3"><h1 className="h3">Welcome, {user.firstName || user.login}</h1><button className="btn btn-outline-dark" onClick={onLogout}>Log out</button></div>
    <section className="card card-body mb-4"><h2 className="h4">Host a game</h2><p>Create a lobby and share its code. Guests join by nickname and control one character per team together.</p><button className="btn btn-dark" disabled={creating} onClick={() => void create()}>{creating ? 'Creating…' : 'Create lobby'}</button>{error && <p role="alert" className="text-danger mt-2">{error}</p>}</section>
    <h2 className="h4">Your matches</h2>
    {historyError && <p role="alert">{historyError} <button onClick={() => setRetry(v => v + 1)}>Retry</button></p>}
    {loading ? <p>Loading matches…</p> : !historyError && <>
      {!matches.length && <p>No matches yet.</p>}
      <ul className="list-group mb-3">{matches.map(m => <li className="list-group-item" key={m.code}><div className="d-flex justify-content-between flex-wrap gap-2"><span><strong>{m.code}</strong> · {m.status} · {m.playerCount} guests · {new Date(m.createdAt).toLocaleString()}</span><span className="d-flex gap-3">{m.status !== 'finished' && <Link to={`/host/${m.code}`}>Resume hosting</Link>}<Link to={`/matches/${m.code}`}>View statistics</Link></span></div>{m.result && <small>{m.result.winner ? `${m.result.winner} wins` : 'No winner'} · {m.result.reason.replaceAll('-', ' ')}</small>}</li>)}</ul>
      <div className="d-flex gap-2"><button className="btn btn-outline-dark" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span className="p-2">Page {page}</span><button className="btn btn-outline-dark" disabled={!more} onClick={() => setPage(p => p + 1)}>Next</button></div>
    </>}
  </PageLayout>
}
