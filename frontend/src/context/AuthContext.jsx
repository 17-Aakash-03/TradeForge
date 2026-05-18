import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('access_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('access_token')
    if (savedToken) {
      authAPI.me()
        .then(res => {
          setUser(res.data)
          setToken(savedToken)
        })
        .catch(() => {
          localStorage.removeItem('access_token')
          setToken(null)
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login(email, password)
    const accessToken = res.data.access_token
    localStorage.setItem('access_token', accessToken)
    setToken(accessToken)
    setUser(res.data.user)
    return res.data
  }

  const register = async (email, username, password) => {
    const res = await authAPI.register(email, username, password)
    if (res.data.access_token) {
      localStorage.setItem('access_token', res.data.access_token)
      setToken(res.data.access_token)
      setUser(res.data.user)
    }
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('tf_remember_email')
    setToken(null)
    setUser(null)
  }

  if (loading) {
    return (
      <div style={{
        minHeight:'100vh', background:'#080808',
        display:'flex', alignItems:'center', justifyContent:'center'
      }}>
        <div style={{ color:'#00d4aa', fontSize:'14px', fontFamily:'Inter, sans-serif' }}>
          ⏳ Loading TradeForge...
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)