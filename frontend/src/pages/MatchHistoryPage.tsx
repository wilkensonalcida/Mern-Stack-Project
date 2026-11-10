import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getMatchHistory, type Match } from '../api/matches'
import MatchStats from '../components/MatchStats'
import PageLayout from '../components/PageLayout'
export default function MatchHistoryPage() {
  const { code = '' } = useParams()
  const [match, setMatch] = useState<Match | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setError(''); setMatch(null)
    getMatchHistory(code).then(r => { if (active) setMatch(r.match) }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [code, retry])
  return <PageLayout wide><Link to="/">Back to dashboard</Link><h1 className="h3 mt-3">Match history: {code}</h1>
    {error && <p role="alert">{error} <button onClick={() => setRetry(v => v + 1)}>Retry</button></p>}
    {match ? <><p>Status: {match.status}. {match.result?.winner ? `Winner: ${match.result.winner}.` : ''} {match.result?.reason.replaceAll('-', ' ')}</p><p>{new Date(match.createdAt).toLocaleString()}</p><MatchStats match={match} /></> : !error && <p>Loading history…</p>}
  </PageLayout>
}
