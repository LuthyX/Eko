import axios from 'axios'
import type {
  TokenResponse, UserResponse, TraderProfileResponse, JobSeekerProfileResponse,
  EkoScoreResponse, EkoScoreHistoryItem,
  WalletResponse, WalletTransactionResponse,
  CreditEligibilityResponse, LoanResponse, RepaymentResponse,
  OpportunityResponse, OpportunityFeedItem, MatchResponse,
  ApplicantRankedResponse, CompleteJobResponse, SeekerProfileResponse,
} from '@/types'

const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('eko_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('eko_token')
      localStorage.removeItem('eko_role')
      localStorage.removeItem('eko_user_id')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; password: string; full_name: string; phone?: string; role: string }) =>
    apiClient.post<TokenResponse>('/auth/register', data).then(r => r.data),

  login: (email: string, password: string) =>
    apiClient.post<TokenResponse>('/auth/login', { email, password }).then(r => r.data),

  me: () => apiClient.get<UserResponse>('/auth/me').then(r => r.data),

  verifyIdentity: (bvn?: string, nin?: string) =>
    apiClient.post<UserResponse>('/auth/verify-identity', { bvn, nin }).then(r => r.data),

  onboardTrader: (data: {
    business_name: string
    business_category: string
    market_location: string
    squad_merchant_id?: string
  }) => apiClient.post<TraderProfileResponse>('/auth/onboard/trader', data).then(r => r.data),

  getTraderProfile: () =>
    apiClient.get<TraderProfileResponse>('/auth/onboard/trader/me').then(r => r.data),

  onboardJobSeeker: (data: {
    skills: string[]
    languages: string[]
    location: string
    daily_rate_expectation?: number
  }) => apiClient.post<JobSeekerProfileResponse>('/auth/onboard/job-seeker', data).then(r => r.data),

  updateJobSeekerProfile: (data: {
    skills?: string[]
    languages?: string[]
    location?: string
    daily_rate_expectation?: number
  }) => apiClient.patch<JobSeekerProfileResponse>('/auth/onboard/job-seeker/me', data).then(r => r.data),

  getJobSeekerProfile: () =>
    apiClient.get<JobSeekerProfileResponse>('/auth/onboard/job-seeker/me').then(r => r.data),
}

// ── Score ─────────────────────────────────────────────────────────────────────

export const scoreApi = {
  getScore: (traderId: number) =>
    apiClient.get<EkoScoreResponse>(`/score/${traderId}`).then(r => r.data),

  getHistory: (traderId: number, limit = 30) =>
    apiClient.get<EkoScoreHistoryItem[]>(`/score/${traderId}/history?limit=${limit}`).then(r => r.data),
}

// ── Wallet ────────────────────────────────────────────────────────────────────

export const walletApi = {
  getWallet: () => apiClient.get<WalletResponse>('/wallet/me').then(r => r.data),

  getTransactions: (limit = 50) =>
    apiClient.get<WalletTransactionResponse[]>(`/wallet/me/transactions?limit=${limit}`).then(r => r.data),

  withdraw: (data: {
    amount_naira: number
    bank_code: string
    account_number: string
    account_name: string
  }) => apiClient.post('/wallet/withdraw', data).then(r => r.data),
}

// ── Credit ────────────────────────────────────────────────────────────────────

export const creditApi = {
  getEligibility: () =>
    apiClient.get<CreditEligibilityResponse>('/credit/eligibility').then(r => r.data),

  apply: (amount_naira: number, requested_sweep_rate_pct?: number) =>
    apiClient.post<LoanResponse>('/credit/apply', { amount_naira, requested_sweep_rate_pct }).then(r => r.data),

  getActiveLoan: () =>
    apiClient.get<LoanResponse | null>('/credit/loan/active').then(r => r.data),

  getLoanHistory: () =>
    apiClient.get<LoanResponse[]>('/credit/loan/history').then(r => r.data),

  repay: (amount_naira: number) =>
    apiClient.post<RepaymentResponse>('/credit/loan/repay', { amount_naira }).then(r => r.data),

  getRepayments: (loanId: number) =>
    apiClient.get<RepaymentResponse[]>(`/credit/loan/${loanId}/repayments`).then(r => r.data),

  updateSweepRate: (sweep_rate_pct: number) =>
    apiClient.patch<LoanResponse>('/credit/loan/active/sweep-rate', { sweep_rate_pct }).then(r => r.data),
}

// ── Matching ──────────────────────────────────────────────────────────────────

export const matchApi = {
  postOpportunity: (data: {
    title: string
    description?: string
    daily_pay: number
    duration_days: number
    location: string
    language_required?: string
    skills_required?: string[]
  }) => apiClient.post<OpportunityResponse>('/match/opportunities', data).then(r => r.data),

  getMyOpportunities: () =>
    apiClient.get<OpportunityResponse[]>('/match/opportunities/mine').then(r => r.data),

  browseOpportunities: () =>
    apiClient.get<OpportunityFeedItem[]>('/match/opportunities').then(r => r.data),

  getOpportunity: (id: number) =>
    apiClient.get<OpportunityResponse>(`/match/opportunities/${id}`).then(r => r.data),

  getOpportunityForSeeker: (id: number) =>
    apiClient.get<OpportunityFeedItem>(`/match/opportunities/${id}/seeker-view`).then(r => r.data),

  apply: (opportunityId: number) =>
    apiClient.post<MatchResponse>(`/match/opportunities/${opportunityId}/apply`, {}).then(r => r.data),

  getApplicants: (opportunityId: number) =>
    apiClient.get<ApplicantRankedResponse[]>(`/match/opportunities/${opportunityId}/applicants`).then(r => r.data),

  acceptApplicant: (matchId: number) =>
    apiClient.post<MatchResponse>(`/match/applications/${matchId}/accept`, {}).then(r => r.data),

  completeJob: (matchId: number) =>
    apiClient.post<CompleteJobResponse>(`/match/applications/${matchId}/complete`, {}).then(r => r.data),

  getMyApplications: () =>
    apiClient.get<MatchResponse[]>('/match/applications/mine').then(r => r.data),

  getSeekerProfile: (seekerId: number) =>
    apiClient.get<SeekerProfileResponse>(`/match/seekers/${seekerId}/profile`).then(r => r.data),

  rateMatch: (matchId: number, rating: number, comment?: string) =>
    apiClient.post(`/match/applications/${matchId}/rate`, { rating, comment }).then(r => r.data),
}
