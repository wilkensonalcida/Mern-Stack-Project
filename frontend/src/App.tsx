
import { useEffect, useState } from 'react'
import { Route, Routes, Navigate } from 'react-router'

import LandingPage from './pages/LandingPage'
import JoinPage from './pages/JoinPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HostPage from './pages/HostPage'
import PlayPage from './pages/PlayPage'

interface AuthData {
  token: string
  user: {
    _id: string
    login?: string
  }
}

interface User {
  _id: string
  login: string
  firstName?: string
  lastName?: string
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore the user's login when the application opens.
  useEffect(() => {
    async function checkLogin() {
      const token = localStorage.getItem('token')
      const savedUser = localStorage.getItem('user')

      if (!token || !savedUser) {
        setLoading(false)
        return
      }

      try {
        const storedUser = JSON.parse(savedUser)

        const response = await fetch(`/api/users/${storedUser._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Login expired')
        }

        const data = await response.json()
        setUser(data)
      } catch (err) {
        console.error('Could not restore login:', err)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkLogin()
  }, [])

  // Save the user's login after registration or successful login.
  function handleAuth(data: AuthData) {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user as User)
  }

  // Log the user out.
  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (loading) {
    return <p>Loading...</p>
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <LandingPage onLogout={handleLogout} />
          ) : (
            <LoginPage onLogin={handleAuth} />
          )
        }
      />

      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage onLogin={handleAuth} />
          )
        }
      />

      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <RegisterPage onRegister={handleAuth} />
          )
        }
      />

      <Route path="/join" element={<JoinPage />} />
      <Route path="/play/:sessionCode" element={<PlayPage />} />

      <Route
        path="/host"
        element={
          user ? <HostPage /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  )
}
