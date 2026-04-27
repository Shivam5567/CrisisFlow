import { createContext, useContext, useEffect, useState } from 'react'
import { getMe, login as apiLogin, register as apiRegister } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('crisisflow_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      localStorage.setItem('crisisflow_token', token)
      fetchUser()
    } else {
      localStorage.removeItem('crisisflow_token')
      setUser(null)
      setLoading(false)
    }
  }, [token])

  async function fetchUser() {
    try {
      const { data } = await getMe()
      setUser(data)
    } catch (e) {
      console.error("Failed to load user session", e)
      setToken(null) // invalid token
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    const { data } = await apiLogin({ email, password })
    setToken(data.access_token)
  }

  async function register(name, role, email, password, location_coords) {
    const { data } = await apiRegister({ name, role, email, password, location_coords })
    setToken(data.access_token)
  }

  function logout() {
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
