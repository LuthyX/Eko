import { createContext, useState, useContext, useEffect } from 'react'

const AuthContext = createContext()
const TraderContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error('Failed to parse stored user:', e)
      }
    }
    setLoading(false)
  }, [])

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function TraderProvider({ children }) {
  const [trader, setTrader] = useState({
    ekoScore: 74,
    riskLevel: 'A',
    verified: true,
    balance: 2400000,
    earnedBalance: 48200,
    activeJobs: 1,
    scoreChange: 3,
    scoreTrend: 'up',
    ekoCredit: {
      eligible: true,
      amount: 180000,
      available: 146200,
      repaymentRate: '10% per receipt',
      fixedInstalments: 'None',
      fee: 9000,
      totalRepay: 189000,
      currentAdvance: 146200,
      repaymentProgress: 10,
      disbursed: 180000,
      lastUpdated: 'Today',
    },
    jobs: [
      {
        id: 1,
        title: 'Market sales assistant',
        status: 'IN PROGRESS',
        rate: '₦4,888/day',
        applicants: 5,
        tags: ['Balogum Market', '3 days'],
      },
      {
        id: 2,
        title: 'Shop assistant - festive stock',
        status: 'COMPLETED',
        rate: '₦3,888/day',
        tags: ['Tech retail', '3 days'],
      },
      {
        id: 3,
        title: 'Cashier cover',
        status: 'COMPLETED',
        rate: '₦3,000',
        tags: ['1 week'],
      },
    ],
  })

  const updateTraderData = (newData) => {
    setTrader((prev) => ({ ...prev, ...newData }))
  }

  return (
    <TraderContext.Provider value={{ trader, updateTraderData }}>
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
