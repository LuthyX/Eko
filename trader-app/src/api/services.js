import api from './client'

// Auth
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  getCurrentUser: () => api.get('/auth/me'),
  verifyIdentity: (data) => api.post('/auth/verify-identity', data),
  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    return Promise.resolve()
  },
}

// Trader Onboarding & Profile
export const traderService = {
  onboard: (data) => api.post('/auth/onboard/trader', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/trader/profile', data),
}

// EkoScore
export const scoreService = {
  getScore: (traderId) => api.get(`/score/${traderId}`),
  getScoreHistory: (traderId) => api.get(`/score/${traderId}/history`),
  computeScore: (traderId, data) => api.post(`/score/compute/${traderId}`, data),
}

// EkoCredit
export const creditService = {
  checkEligibility: () => api.get('/credit/eligibility'),
  apply: (data) => api.post('/credit/apply', data),
  getActiveLoan: () => api.get('/credit/loan/active'),
  getLoanHistory: () => api.get('/credit/loan/history'),
  manualRepay: (data) => api.post('/credit/repay/manual', data),
}

// Wallet
export const walletService = {
  getBalance: () => api.get('/wallet/me'),
  getTransactions: (limit = 50) => api.get('/wallet/me/transactions', { params: { limit } }),
  withdraw: (data) => api.post('/wallet/withdraw', data),
}

// Job Matching
export const matchService = {
  postJob: (data) => api.post('/match/job/post', data),
  getMyJobs: () => api.get('/match/trader/jobs'),
  getJobApplicants: (jobId) => api.get(`/match/job/${jobId}/applicants`),
  rateApplicant: (jobId, applicantId, data) => api.post(`/match/job/${jobId}/applicant/${applicantId}/rate`, data),
}

// Job Seeker
export const seekerService = {
  onboard: (data) => api.post('/auth/onboard/job-seeker', data),
  getJobsNearby: () => api.get('/match/seeker/jobs'),
  applyForJob: (jobId) => api.post(`/match/job/${jobId}/apply`),
  getApplications: () => api.get('/match/seeker/applications'),
}
