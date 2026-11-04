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
  }
}
interface User {
  _id: string
  login: string
  firstname?: string
  lastName?: string
}

export default function App() {
  const[user, setUser] = useState<User | user>(null)
  const[loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkLogin() {
      const token = locaclStorage.getItem('token')
      const savedUser = localStorage.getItem('user')

      if(!token || !savedUser) {
        setLoading(false)
        return
      }
      try {
        const storedUser = JSON.parse(savedUser)

        const response = await fetch(`api/users/${storedUser._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if(!response.ok){
          throw new Error('Login expired')
        }

        const data = await response.json()
        setUser(data)
      } catch (err) {
        console.error('Could not restore login:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      } finally {
        setLoading(false)
      }
    }
    checkLogin()
  }, [])

  function handleAuth(data : AuthData) {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user as User)
  }
  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
  if(loading) {
    return <p>Loading...</p>
  }
  return (
    <Routes>
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
      <Route path="/host" element={<HostPage />} />
    </Routes>
  )
}
