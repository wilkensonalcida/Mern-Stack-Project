import { Link } from 'react-router'
import type { User } from '../api/auth'
import PageLayout from '../components/PageLayout'

interface DashboardPageProps {
  user: User
  onLogout: () => void
}

export default function DashboardPage({ user, onLogout }: DashboardPageProps) {
  const name = user.firstName || user.login

  return (
    <PageLayout>
      <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
        <h1 className="h3 mb-0 text-truncate">Wassup, {name}!</h1>
        <button className="btn btn-outline-dark btn-sm flex-shrink-0" type="button" onClick={onLogout}>Log out</button>
      </div>

      <section className="card" aria-labelledby="host-heading">
        <div className="card-body p-4">
          <h2 className="h4 card-title" id="host-heading">Host a game</h2>
          <p className="text-body-secondary">Create a lobby, share its code, and start when everyone's in.</p>
          {/* TODO (API): Create the game before opening its lobby. */}
          <Link className="btn btn-dark w-100" to="/host">Create a lobby</Link>
        </div>
      </section>
    </PageLayout>
  )
}
