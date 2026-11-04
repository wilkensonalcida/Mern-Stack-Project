import { Link } from 'react-router'
import { useState } from 'react'

interface LoginPageProps {
  onLogin: (data: { roken: string; user: { _id: string } }) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSerror('')
    setLoading(true)

    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/auth/login', {
        method: POST,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: formData.get('username'),
          password: formData.get('password'),
        })
      })

      const data = await response.json()

      if(!response.ok){
        throw new Error(data.error || 'Login failed')
      }

      onLogin(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }
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
