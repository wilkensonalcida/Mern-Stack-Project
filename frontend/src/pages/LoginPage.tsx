import { Link } from 'react-router'

export default function LoginPage() {
  return (
    <>
      <div className="login-container">
        <h1 className="login-title">Login to Fight Me Bro!</h1>
      </div>
      <form id="login-form" onSubmit={(event) => event.preventDefault()}>
        <div className="login-form">
          <label htmlFor="username">Username</label>
          <input
            className="form-text"
            type="text"
            id="username"
            name="username"
            placeholder="Username"
            autoComplete="username"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            className="form-text"
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          <div className="login-row">
            <label className="remember-label" htmlFor="remember">
              <input className="remember-input" type="checkbox" id="remember" name="remember" />
              Remember me!
            </label>
          </div>
          <button className="btn-primary" type="submit">Login</button>
          <div className="login-divider">
            <span>OR</span>
          </div>
          <Link className="btn-primary" to="/register">Sign Up</Link>
        </div>
      </form>
    </>
  )
}
