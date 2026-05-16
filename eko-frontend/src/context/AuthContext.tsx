import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi, walletApi } from '@/api'
import type { UserResponse, UserRole, TraderProfileResponse, JobSeekerProfileResponse } from '@/types'

interface AuthState {
  user: UserResponse | null
  token: string | null
  role: UserRole | null
  userId: number | null
  traderProfile: TraderProfileResponse | null
  seekerProfile: JobSeekerProfileResponse | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; full_name: string; phone?: string; role: UserRole }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  setTraderProfile: (p: TraderProfileResponse) => void
  setSeekerProfile: (p: JobSeekerProfileResponse) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('eko_token'))
  const [role, setRole] = useState<UserRole | null>(() => localStorage.getItem('eko_role') as UserRole | null)
  const [userId, setUserId] = useState<number | null>(() => {
    const id = localStorage.getItem('eko_user_id')
    return id ? parseInt(id) : null
  })
  const [traderProfile, setTraderProfile] = useState<TraderProfileResponse | null>(null)
  const [seekerProfile, setSeekerProfile] = useState<JobSeekerProfileResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const refreshUser = async () => {
    try {
      const u = await authApi.me()
      setUser(u)
      setRole(u.role)
      setUserId(u.id)

      // Always provision wallet on load
      walletApi.getWallet().catch(() => {})

      // Load role-specific profile
      if (u.role === 'trader') {
        try {
          const tp = await authApi.getTraderProfile()
          setTraderProfile(tp)
        } catch { /* not onboarded yet */ }
      } else if (u.role === 'job_seeker') {
        try {
          const sp = await authApi.getJobSeekerProfile()
          setSeekerProfile(sp)
        } catch (e: any) {
          // 404 means not onboarded yet — expected for new users
          if (e?.response?.status !== 404) {
            console.error('Failed to load seeker profile:', e)
          }
        }
      }
    } catch {
      logout()
    }
  }

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    localStorage.setItem('eko_token', data.access_token)
    localStorage.setItem('eko_role', data.role)
    localStorage.setItem('eko_user_id', String(data.user_id))
    setToken(data.access_token)
    setRole(data.role)
    setUserId(data.user_id)
    await refreshUser()
  }

  const register = async (data: { email: string; password: string; full_name: string; phone?: string; role: UserRole }) => {
    const res = await authApi.register(data)
    localStorage.setItem('eko_token', res.access_token)
    localStorage.setItem('eko_role', res.role)
    localStorage.setItem('eko_user_id', String(res.user_id))
    setToken(res.access_token)
    setRole(res.role)
    setUserId(res.user_id)
    await refreshUser()
  }

  const logout = () => {
    localStorage.removeItem('eko_token')
    localStorage.removeItem('eko_role')
    localStorage.removeItem('eko_user_id')
    setToken(null)
    setRole(null)
    setUserId(null)
    setUser(null)
    setTraderProfile(null)
    setSeekerProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      user, token, role, userId, traderProfile, seekerProfile,
      isLoading, isAuthenticated: !!token && !!user,
      login, register, logout, refreshUser,
      setTraderProfile, setSeekerProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
