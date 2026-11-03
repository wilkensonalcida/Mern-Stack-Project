const sampleLobby = {
  code: 'NITRO',
  teams: [
    {
      id: 'red',
      name: 'Red team',
      players: [
        { id: 'player-1', name: 'Nathan' },
        { id: 'player-2', name: 'Nate' },
        { id: 'player-3', name: 'Nathaniel' },
      ],
    },
    {
      id: 'blue',
      name: 'Blue team',
      players: [
        { id: 'player-4', name: 'Nathanael' },
        { id: 'player-5', name: 'Nat' },
        { id: 'player-6', name: 'Nathy' },
      ],
    },
  ],
  unassignedPlayers: [
    { id: 'player-7', name: 'Nathan Jr.' },
    { id: 'player-8', name: 'Nate the Great' },
  ],
}

export default function HostPage() {
  const playerCount = sampleLobby.teams.reduce(
    (total, team) => total + team.players.length,
    sampleLobby.unassignedPlayers.length,
  )

  return (
    <main>
      <header>
        <h1>Host lobby</h1>
        <p>Game session code: <strong>{sampleLobby.code}</strong></p>
        <p>Waiting for players to join and choose a team.</p>
        <p id="lobby-preview">Preview with sample players.</p>
      </header>

      <section aria-labelledby="players-heading">
        <h2 id="players-heading">Players in the lobby ({playerCount})</h2>
        {sampleLobby.teams.map((team) => (
          <section key={team.id} aria-labelledby={`${team.id}-team-heading`}>
            <h3 id={`${team.id}-team-heading`}>{team.name} ({team.players.length})</h3>
            {team.players.length > 0 ? (
              <ul>
                {team.players.map((player) => <li key={player.id}>{player.name}</li>)}
              </ul>
            ) : (
              <p>No players have selected this team yet.</p>
            )}
          </section>
        ))}

        <section aria-labelledby="unassigned-heading">
          <h3 id="unassigned-heading">Waiting for a team ({sampleLobby.unassignedPlayers.length})</h3>
          {sampleLobby.unassignedPlayers.length > 0 ? (
            <ul>
              {sampleLobby.unassignedPlayers.map((player) => <li key={player.id}>{player.name}</li>)}
            </ul>
          ) : (
            <p>Everyone has selected a team.</p>
          )}
        </section>
      </section>

      <section aria-labelledby="controls-heading" aria-describedby="lobby-preview">
        <h2 id="controls-heading">Match controls</h2>
        <button type="button">Start game</button>
        <button type="button">Cancel match</button>
      </section>
    </main>
  )
}
