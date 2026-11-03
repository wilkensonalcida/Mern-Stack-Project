import { Link } from 'react-router'

export default function LandingPage() {
  return (
    <main>
      <h1>Fight Me Bro!</h1>
      <section aria-labelledby="join-heading">
        <h2 id="join-heading">Join a game</h2>
        <p>Have a game PIN? Join without an account.</p>
        <Link to="/join">Join a game</Link>
      </section>
      <section aria-labelledby="host-heading">
        <h2 id="host-heading">Host a game</h2>
        <p>Log in or create an account to host.</p>
        <p><Link to="/login">Log in</Link></p>
        <p><Link to="/register">Create an account</Link></p>
      </section>
    </main>
  )
}
