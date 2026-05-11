/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import { api, getStoredAuthToken, setStoredAuthToken } from '../services/api'

const AUTH_STORAGE_KEY = 'leadflow-authenticated'

const AuthContext = createContext(null)

function readStoredAuth() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true' && Boolean(getStoredAuthToken())
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(readStoredAuth)

  const value = useMemo(() => ({
    isAuthenticated,
    async login(username, password) {
      try {
        const result = await api.login(username, password)
        setStoredAuthToken(result.token)
        setIsAuthenticated(true)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(AUTH_STORAGE_KEY, 'true')
        }
        return { ok: true }
      } catch (error) {
        setStoredAuthToken(null)
        return { ok: false, message: error.message || 'Invalid username or password.' }
      }
    },
    logout() {
      setStoredAuthToken(null)
      setIsAuthenticated(false)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    },
  }), [isAuthenticated])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
