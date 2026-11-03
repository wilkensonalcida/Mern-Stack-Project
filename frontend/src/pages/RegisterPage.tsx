import { Link } from 'react-router'

export default function RegisterPage() {
  return (
    <main>
      <h1>Create an account</h1>
      <p>Choose a username and password. All fields are required.</p>
      <form onSubmit={(event) => event.preventDefault()}>
        <div>
          <label htmlFor="register-username">Username</label>
          <input
            type="text"
            id="register-username"
            name="login"
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label htmlFor="register-password">Password</label>
          <input
            type="password"
            id="register-password"
            name="password"
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <label htmlFor="register-confirm-password">Confirm password</label>
          <input
            type="password"
            id="register-confirm-password"
            name="confirmPassword"
            autoComplete="new-password"
            required
          />
        </div>
        <button type="submit">
          Create account
        </button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </main>
  )
}
