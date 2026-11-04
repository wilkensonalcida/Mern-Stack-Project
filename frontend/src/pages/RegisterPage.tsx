import { Link } from 'react-router'
import { useState } from 'react'

interface RegisterPageProps {
  onRegister: (data: { token: string; user: { _id: string } }) => void
}

export default function RegisterPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event : React.FormEvent<HTMLFormElement>){
    event.preventDefault()
    setError('')

    const formData = new FormData(event.currentTarget)

    const password = formData.get('password')
    const confirmPassword = formData.get('confirmPassword')

    if(password !== confirmPassowrd) {
      setError('Passwords do not match!')
      return
    }
    setLoading(true)
    try{
      const response = await fetch('/api/users', {
        method: POST,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: formData.get('login'),
          password: password,
        }),
      })

      const data = await response.json()

      if(!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }
      onRegister(data)
    } catch (error) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }
  return (
    <main>
      <h1>Create an account</h1>
      <p>Choose a username and password. All fields are required.</p>
      <form onSubmit={handleSubmit}>
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
        {error && <p role="alert">{error}</p>
        <button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </main>
  )
}
