import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { User } from '../api/auth'
import type { LobbyResponse } from '../socket/lobby'
import { socket } from '../socket/socket'
import PageLayout from '../components/PageLayout'

interface DashboardPageProps {
  user: User
  onLogout: () => void
}

export default function DashboardPage({ user, onLogout }: DashboardPageProps) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const name = user.firstName || user.login

  function createLobby() {
    if (creating) return

    setCreating(true)
    setError("")

    socket.timeout(5000).emit(
      "game:create",
      {},
      (err: Error | null, response: LobbyResponse) => {
        setCreating(false)
        if(err || !response?.success || !response.lobby) {
          setError(
            response?.error || "Unable to create lobby! :("
          )
          return
        }
        navigate(`/host/${response.lobby.code}`)
      }
    )
  }

  return (
    <PageLayout>
      <h1 className="text-truncate">Wassup, {name}!</h1>

      <section className="card" aria-labelledby="host-heading">
        <div className="card-body p-4">
          <h2 className="card-title" id="host-heading">Host a game</h2>
          <p className="text-body-secondary">Create a lobby, share its code, and start when everyone's in.</p>
          {/* TODO (API): Create the game before opening its lobby. */}
          <button className="btn btn-dark w-100" type="button" onClick={createLobby} disabled={creating}>
            {creating ? "Creating lobby..." : "Create lobby!"}
          </button>
           {error && (
            <p className="text-danger mt-3" role="alert">
              {error}
            </p>
          )}
          {/* Log out sits under the main button, where the other account pages keep their links. */}
          <p className="mt-3 mb-0 text-center">
            <button className="btn btn-link p-0 align-baseline" type="button" onClick={onLogout}>Log out</button>
          </p>
        </div>
      </section>
    </PageLayout>
  )
}
