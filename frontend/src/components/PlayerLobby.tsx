type PlayerLobbyProps = {
  sessionCode: string
  player: { id: string; name: string }
  teams: {
    id: string
    name: string
    players: { id: string; name: string }[]
  }[]
}

export default function PlayerLobby({ sessionCode, player, teams }: PlayerLobbyProps) {
  const players = teams.flatMap((team) => team.players)
  const selectedTeam = teams.find((team) => team.players.some((member) => member.id === player.id))

  return (
    <>
      <header>
        <h1>Player lobby</h1>
        <p>Game session code: <strong>{sessionCode}</strong></p>
        <p>Nickname: <strong>{player.name}</strong></p>
        <p id="lobby-preview">Preview with sample players. Controls are placeholders.</p>
      </header>

      <section aria-labelledby="teams-heading" aria-describedby="lobby-preview">
        <h2 id="teams-heading">Choose a team</h2>
        <p>Players in the lobby: {players.length}</p>
        <p>Selected team: <strong>{selectedTeam?.name ?? 'No team selected'}</strong></p>
        {teams.map((team) => (
          <section key={team.id} aria-labelledby={`${team.id}-team-heading`}>
            <h3 id={`${team.id}-team-heading`}>{team.name} ({team.players.length})</h3>
            {team.players.length > 0 ? (
              <ul>
                {team.players.map((member) => (
                  <li key={member.id}>{member.name}{member.id === player.id ? ' (you)' : ''}</li>
                ))}
              </ul>
            ) : (
              <p>No players have selected this team yet.</p>
            )}
            {/* TODO (API): Have PlayPage send this team choice to the server.
                Check on the server that this player can join the team before updating the list.
                Show an error here if the request fails. */}
            <button type="button" aria-pressed={selectedTeam?.id === team.id}>
              Join {team.name.toLowerCase()}
            </button>
          </section>
        ))}
      </section>

      <p role="status">Waiting for the host to start the game.</p>
      {/* TODO (API): Ask the server to remove this player from the session.
          After success, clear the saved player and return to /join. If leaving fails, show an error here. */}
      <button type="button" aria-describedby="lobby-preview">Leave lobby</button>
    </>
  )
}
