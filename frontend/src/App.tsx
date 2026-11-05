import { useEffect, useState } from 'react'
import { Route, Routes, Navigate } from 'react-router'
import LandingPage from './pages/LandingPage'
import JoinPage from './pages/JoinPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HostPage from './pages/HostPage'
import PlayPage from './pages/PlayPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import { AuthError, type LoginResult, type User } from './api/auth'

function clearStoredLogin() {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = window[name]
      for (const key of ['token', 'user']) {
        try { storage.removeItem(key) } catch { /* Browser storage may be disabled. */ }
      }
    } catch { /* In-memory logout must still work if storage is unavailable. */ }
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [restoreError, setRestoreError] = useState('')
  const [restoreAttempt, setRestoreAttempt] = useState(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    setLoading(true)
    setRestoreError('')
    async function checkLogin() {
      try {
        const storage = sessionStorage.getItem('token') ? sessionStorage : localStorage
        const token = storage.getItem('token')
        const savedUser = storage.getItem('user')
        if (!token || !savedUser) return
        let storedUser: User
        try {
          storedUser = JSON.parse(savedUser)
          if (!storedUser || typeof storedUser._id !== 'string' || !/^[a-f0-9]{24}$/i.test(storedUser._id)) {
            throw new Error('Invalid stored user')
          }
        } catch {
          clearStoredLogin()
          return
        }
        const response = await fetch(`/api/users/${storedUser._id}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!active) return
        if ([401, 403, 404].includes(response.status)) {
          clearStoredLogin()
          setUser(null)
          return
        }
        if (!response.ok) throw new Error('Unable to check your login. Please retry.')
        const data = await response.json()
        if (!active) return
        if (!data || data._id !== storedUser._id || typeof data.login !== 'string') {
          throw new Error('The server returned an unexpected account response.')
        }
        if (data.emailVerified !== true) {
          clearStoredLogin()
          setUser(null)
          return
        }
        setUser(data)
      } catch (error) {
        if (active) setRestoreError(error instanceof Error && error.name !== 'AbortError'
          ? 'Unable to restore your login. Check the connection and retry.'
          : 'Checking your login timed out. Please retry.')
      } finally {
        window.clearTimeout(timeout)
        if (active) setLoading(false)
      }
    }
    void checkLogin()
    return () => { active = false; window.clearTimeout(timeout); controller.abort() }
  }, [restoreAttempt])

  function handleAuth(data: LoginResult, remember: boolean) {
    try {
      const storage = remember ? localStorage : sessionStorage
      const other = remember ? sessionStorage : localStorage
      storage.setItem('token', data.token)
      storage.setItem('user', JSON.stringify(data.user))
      other.removeItem('token')
      other.removeItem('user')
    } catch {
      clearStoredLogin()
      throw new AuthError(0, 'Unable to save your login. Enable browser storage and try again.')
    }
    setUser(data.user)
  }

  function handleLogout() {
    clearStoredLogin()
    setUser(null)
    setRestoreError('')
  }

  if (loading) return <p>Loading...</p>
  if (restoreError) return (
    <main>
      <p role="alert">{restoreError}</p>
      <button type="button" onClick={() => setRestoreAttempt(value => value + 1)}>Retry</button>
      <button type="button" onClick={handleLogout}>Continue signed out</button>
    </main>
  )

  return (
    <Routes>
      <Route path="/" element={user ? <LandingPage onLogout={handleLogout} /> : <LoginPage onLogin={handleAuth} />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage onLogin={handleAuth} />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/play/:sessionCode" element={<PlayPage />} />
      <Route path="/host" element={user ? <HostPage /> : <Navigate to="/login" replace />} />
    </Routes>
  )
}
