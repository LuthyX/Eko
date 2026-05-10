import api from './client'

// Auth
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => {
    localStorage.removeItem('auth_token')
    return Promise.resolve()
  },
}

// Trader Profile
export const traderService = {
  getProfile: () => api.get('/trader/profile'),
  updateProfile: (data) => api.put('/trader/profile', data),
  linkSquad: (squadId) => api.post('/trader/link-squad', { squad_id: squadId }),
}

// EkoScore
export const scoreService = {
  getScore: () => api.get('/trader/score'),
  getScoreBreakdown: () => api.get('/trader/score/breakdown'),
}

// EkoCredit
export const creditService = {
  getOffer: () => api.get('/trader/credit/offer'),
  applyCredit: (amount) => api.post('/trader/credit/apply', { amount }),
  getRepaymentStatus: () => api.get('/trader/credit/repayment'),
}

// Opportunities
export const opportunityService = {
  postOpportunity: (data) => api.post('/opportunities', data),
  getMyOpportunities: () => api.get('/trader/opportunities'),
  closeOpportunity: (id) => api.put(`/opportunities/${id}/close`),
}

// EkoSave
export const saveService = {
  getVault: () => api.get('/trader/save/vault'),
  updateSaveRate: (rate) => api.put('/trader/save/rate', { percentage: rate }),
}

// Insurance
export const insuranceService = {
  getAvailableProducts: () => api.get('/trader/insurance/products'),
  getPolicies: () => api.get('/trader/insurance/policies'),
}
