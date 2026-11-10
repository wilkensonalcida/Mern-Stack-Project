import type { Match } from '../api/matches'
export default function MatchStats({ match }: { match: Match }) {
  return <>
    <h2 className="h4">Guest contributions</h2>
    <p className="text-body-secondary">Accepted taps across all rounds. Rejected or late taps are not counted.</p>
    <div className="table-responsive"><table className="table">
      <thead><tr><th>Nickname</th><th>Team</th><th>Attack</th><th>Heal</th><th>Block</th><th>Total</th></tr></thead>
      <tbody>{match.players.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.team || 'Unassigned'}</td><td>{p.clicks.attack}</td><td>{p.clicks.heal}</td><td>{p.clicks.block}</td><td>{p.clicks.attack + p.clicks.heal + p.clicks.block}</td></tr>)}</tbody>
    </table></div>
    <h2 className="h4">Team characters and equipment</h2>
    <div className="row g-3">{(['red', 'blue'] as const).map(team => {
      const c = match.characters[team]
      return <section className="col-sm-6" key={team}><div className="card card-body"><h3 className="h5 text-capitalize">{team} character</h3>
        {c ? <><p>HP: {c.hp} / {c.maxHp}</p><ul>{c.items.map((item, i) => <li key={i}>{item.name} — {item.slot}, +25% {item.action}, earned after NPC {item.earnedStage}</li>)}</ul>{!c.items.length && <p>No equipment earned.</p>}</> : <p>Game did not start.</p>}
      </div></section>
    })}</div>
  </>
}
