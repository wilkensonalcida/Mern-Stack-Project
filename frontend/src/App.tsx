import { useEffect, useState } from 'react'
import { Route, Routes, Navigate } from 'react-router'
import { socket } from "./socket/socket";
import DashboardPage from './pages/DashboardPage'
import JoinPage from './pages/JoinPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HostPage from './pages/HostPage'
import PlayPage from './pages/PlayPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import { AuthError, type LoginResult, type User } from './api/auth'
import PageLayout from './components/PageLayout'
import LobbyPage from './pages/LobbyPage';


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

    socket.connect();
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
          ? 'Check your connection.'
          : 'The server took too long to answer.')
      } finally {
        window.clearTimeout(timeout)
        if (active) setLoading(false)
      }
    }
    void checkLogin()
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); socket.disconnect(); }
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

  if (loading) return (
    <PageLayout>
      <p className="text-body-secondary text-center mb-0" role="status">Loading…</p>
    </PageLayout>
  )
  if (restoreError) return (
    <PageLayout>
      <section className="card" aria-labelledby="restore-heading">
        <div className="card-body p-4">
          <h1 className="h4 card-title" id="restore-heading">Can't reach the server</h1>
          <p role="alert">{restoreError}</p>
          <button className="btn btn-dark w-100" type="button" onClick={() => setRestoreAttempt(value => value + 1)}>Reconnect</button>
          <p className="mt-3 mb-0 text-center">
            <button className="btn btn-link p-0 align-baseline" type="button" onClick={handleLogout}>Log out</button>
          </p>
        </div>
      </section>
    </PageLayout>
  )

  return (
    <Routes>
      <Route path="/" element={user ? <DashboardPage user={user} onLogout={handleLogout} /> : <LoginPage onLogin={handleAuth} />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage onLogin={handleAuth} />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage onLogin={handleAuth} />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/lobby/:code" element={<LobbyPage />} />
      <Route path="/play/:code" element={<PlayPage />} />
      <Route path="/host/:code" element={user ? <HostPage /> : <Navigate to="/login" replace />} />
    </Routes>
  )
}
