import { Link } from 'react-router'

export default function JoinPage() {
  return (
    <main>
      <h1>Join a game</h1>
      <p>Enter the PIN from your host and choose a nickname.</p>
      <form onSubmit={(event) => event.preventDefault()}>
        <div>
          <label htmlFor="game-pin">Game PIN</label>
          <input
            type="text"
            id="game-pin"
            name="pin"
            autoComplete="off"
            spellCheck={false}
            required
          />
        </div>
        <div>
          <label htmlFor="player-nickname">Nickname</label>
          <input
            type="text"
            id="player-nickname"
            name="nickname"
            autoComplete="nickname"
            required
          />
        </div>
        <button type="submit">Join game</button>
      </form>
      <p><Link to="/">Back to home</Link></p>
    </main>
  )
}
