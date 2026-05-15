import { createContext, useState, useContext, useEffect } from 'react'
import { authService, scoreService, creditService, walletService } from '../api/services'

const AuthContext = createContext()
const TraderContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        try {
          const response = await authService.getCurrentUser()
          setUser(response.data)
          localStorage.setItem('user', JSON.stringify(response.data))
        } catch (err) {
          console.error('Failed to get current user:', err)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
        }
      }
      setLoading(false)
    }
    
    checkAuth()
  }, [])

  const login = async (email, password) => {
    try {
      setError(null)
      const response = await authService.login(email, password)
      const { access_token, user_id, role } = response.data
      
      localStorage.setItem('auth_token', access_token)
      
      // Fetch full user data
      const userResponse = await authService.getCurrentUser()
      setUser(userResponse.data)
      localStorage.setItem('user', JSON.stringify(userResponse.data))
      
      return userResponse.data
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed'
      setError(message)
      throw err
    }
  }

  const register = async (email, password, fullName, phone, role) => {
    try {
      setError(null)
      const response = await authService.register({
        email,
        password,
        full_name: fullName,
        phone,
        role,
      })
      const { access_token } = response.data
      
      localStorage.setItem('auth_token', access_token)
      
      // Fetch full user data
      const userResponse = await authService.getCurrentUser()
      setUser(userResponse.data)
      localStorage.setItem('user', JSON.stringify(userResponse.data))
      
      return userResponse.data
    } catch (err) {
      const message = err.response?.data?.detail || 'Registration failed'
      setError(message)
      throw err
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function TraderProvider({ children }) {
  const [trader, setTrader] = useState(null)
  const [ekoScore, setEkoScore] = useState(null)
  const [credit, setCredit] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadTraderData = async (userId) => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch wallet
      try {
        const walletResponse = await walletService.getBalance()
        setWallet(walletResponse.data)
      } catch (err) {
        console.error('Failed to fetch wallet:', err)
      }
      
      // Fetch score
      try {
        const scoreResponse = await scoreService.getScore(userId)
        setEkoScore(scoreResponse.data)
      } catch (err) {
        console.error('Failed to fetch score:', err)
      }
      
      // Fetch credit eligibility
      try {
        const creditResponse = await creditService.checkEligibility()
        setCredit(creditResponse.data)
      } catch (err) {
        console.error('Failed to fetch credit eligibility:', err)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateTraderData = (newData) => {
    setTrader((prev) => ({ ...prev, ...newData }))
  }

  return (
    <TraderContext.Provider value={{ 
      trader, 
      ekoScore, 
      credit, 
      wallet, 
      loading, 
      error, 
      updateTraderData, 
      loadTraderData 
    }}>
      {children}
    </TraderContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function useTrader() {
  const context = useContext(TraderContext)
  if (!context) {
    throw new Error('useTrader must be used within TraderProvider')
  }
  return context
}
