import PageLayout from '../components/PageLayout'

const sampleLobby = {
  code: 'NITRO',
  teams: [
    {
      id: 'red',
      name: 'Red team',
      players: [
        { id: 'player-1', name: 'Nathan' },
        { id: 'player-2', name: 'Nate' },
        { id: 'player-3', name: 'Nathaniel Bob' },
      ],
    },
    {
      id: 'blue',
      name: 'Blue team',
      players: [
        { id: 'player-4', name: 'Nathanael' },
        { id: 'player-5', name: 'Nathan Bobby Brown' },
        { id: 'player-6', name: 'Nootu' },
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
    <PageLayout wide>
      {/* Fills the screen above the bar. 3rem is the page's own padding, and 88 pixels leave room for the bar. */}
      <div className="d-flex flex-column" style={{ minHeight: 'calc(100vh - 3rem)', paddingBottom: 88 }}>
        <section className="card" aria-labelledby="code-heading">
          <div className="card-body py-4">
            {/* Where to join sits at the left edge and the QR code at the right, so the code stays in the middle. */}
            <div className="row align-items-center row-gap-3">
              <div className="col-md-3 order-2 order-md-1 text-center text-md-start">
                <p className="text-body-secondary mb-0">Join at</p>
                <p className="fs-5 fw-semibold mb-0">{window.location.host}/join</p>
              </div>
              <div className="col-md-6 order-1 order-md-2 text-center">
                <h1 className="fs-6 fw-normal text-body-secondary mb-1" id="code-heading">Game session code</h1>
                <p className="display-1 fw-bold mb-0">{sampleLobby.code}</p>
              </div>
              <div className="col-md-3 order-3 d-flex justify-content-center justify-content-md-end">
                {/* TODO (API): Show a QR code here that opens /play with this game code. */}
                <div
                  className="border rounded d-flex align-items-center justify-content-center small text-body-secondary"
                  style={{ width: 176, height: 176 }}
                >
                  QR code
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex-grow-1 d-flex flex-column justify-content-center py-4" aria-label="Players">
          {/* Players who just joined wait here until they pick a team. */}
          {sampleLobby.unassignedPlayers.length > 0 && (
            <ul className="d-flex flex-wrap justify-content-center gap-2 list-unstyled mb-3" aria-label="Waiting for a team">
              {sampleLobby.unassignedPlayers.map((player) => (
                <li className="border rounded px-2 py-1" key={player.id}>{player.name}</li>
              ))}
            </ul>
          )}
          <div className="row g-3">
            {sampleLobby.teams.map((team) => (
              <div className="col-6" key={team.id}>
                <section className="card h-100" aria-labelledby={`${team.id}-team-heading`}>
                  <div className="card-body">
                    <h2 className="h6 card-title text-center mb-2" id={`${team.id}-team-heading`}>{team.name}</h2>
                    {team.players.length > 0 ? (
                      <ul className="d-flex flex-wrap justify-content-center gap-2 list-unstyled mb-0">
                        {team.players.map((player) => (
                          <li className="border rounded px-2 py-1" key={player.id}>{player.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-body-secondary text-center mb-0">No players yet.</p>
                    )}
                  </div>
                </section>
              </div>
            ))}
          </div>
        </section>
        {/* With the bar's room, this matches the code banner's height on wider screens, */}
        {/* so the players sit at the middle of the screen, not the middle of the space below the code. */}
        <div className="d-none d-md-block flex-shrink-0" aria-hidden="true" style={{ height: 139 }} />
      </div>

      {/* Stays at the bottom of the screen: cancel on the left, the player count and start on the right. */}
      <div className="position-fixed bottom-0 start-0 end-0 p-3 bg-body d-flex justify-content-between align-items-center gap-3">
        <button className="btn btn-outline-dark text-nowrap" type="button">Cancel match</button>
        <div className="d-flex align-items-center gap-3">
          <span className="fs-5 text-body-secondary text-nowrap" role="status">
            {playerCount} {playerCount === 1 ? 'player' : 'players'}
          </span>
          <button className="btn btn-dark px-md-5 text-nowrap" type="button">Start game</button>
        </div>
      </div>
    </PageLayout>
  )
}
