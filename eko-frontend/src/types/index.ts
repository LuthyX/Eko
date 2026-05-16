// ── Auth ──────────────────────────────────────────────────────
export type UserRole = 'trader' | 'job_seeker' | 'lender'
export type IdentityTier = 'none' | 'bvn' | 'nin' | 'bvn_nin'

export interface TokenResponse {
  access_token: string
  token_type: string
  role: UserRole
  user_id: number
}

export interface UserResponse {
  id: number
  email: string
  full_name: string
  role: UserRole
  identity_tier: IdentityTier
  is_active: boolean
}

export interface TraderProfileResponse {
  id: number
  user_id: number
  full_name: string | null
  phone: string | null
  business_name: string | null
  business_category: string | null
  market_location: string | null
  squad_merchant_id: string | null
  squad_linked: boolean
}

export interface JobSeekerProfileResponse {
  id: number
  user_id: number
  skills: string[] | null
  languages: string[] | null
  location: string | null
  daily_rate_expectation: number | null
}

// ── EkoScore ──────────────────────────────────────────────────
export type RiskTier = 'A' | 'B' | 'C' | 'unscored'

export interface ShapSignal {
  shap_value: number
  weight: number
  label: string
}

export interface EkoScoreResponse {
  id: number
  trader_id: number
  score: number
  risk_tier: RiskTier
  is_cold_start: boolean
  computed_at: string
  transaction_volume_score: number | null
  tenure_recency_score: number | null
  cohort_comparison_score: number | null
  behavioural_stability_score: number | null
  identity_tier_score: number | null
  shap_values: Record<string, ShapSignal> | null
  credit_eligible: boolean
  max_advance_ngn: number | null
}

export interface EkoScoreHistoryItem {
  score: number
  risk_tier: RiskTier
  is_cold_start: boolean
  computed_at: string
}

// ── Wallet ────────────────────────────────────────────────────
export type WalletTxType =
  | 'credit_payment_received'
  | 'credit_loan_disbursement'
  | 'credit_wage_received'
  | 'debit_loan_repayment'
  | 'debit_ekosave_sweep'
  | 'debit_wage_payout'
  | 'debit_withdrawal'
  | 'debit_insurance_premium'

export type WalletTxStatus = 'pending' | 'completed' | 'failed' | 'reversed'

export interface WalletResponse {
  id: number
  user_id: number
  balance_kobo: number
  balance_naira: number
  virtual_account_number: string | null
  virtual_bank_name: string | null
  virtual_account_name: string | null
  is_active: boolean
}

export interface WalletTransactionResponse {
  id: number
  tx_type: WalletTxType
  amount_kobo: number
  amount_naira: number
  direction: 'credit' | 'debit'
  balance_after_naira: number
  status: WalletTxStatus
  squad_reference: string | null
  description: string | null
  created_at: string
}

// ── Credit ────────────────────────────────────────────────────
export type LoanStatus = 'pending' | 'active' | 'repaid' | 'defaulted'

export interface CreditEligibilityResponse {
  eligible: boolean
  reason?: string
  score: number | null
  risk_tier?: RiskTier
  max_advance_naira?: number
  threshold: number
  terms?: {
    minimum_sweep_rate_pct: number
    repayment_window_days: number
    repayment_method: string
    manual_repayment: string
    early_repayment_penalty: string
    estimated_repayment_days: number
    over_window_warning: boolean
  }
}

export interface LoanResponse {
  id: number
  trader_id: number
  amount_kobo: number
  amount_naira: number
  outstanding_kobo: number
  outstanding_naira: number
  fee_amount_naira: number
  fee_rate_pct: number
  total_repayable_naira: number
  status: LoanStatus
  squad_transaction_ref: string | null
  sweep_rate_pct: number
  repayment_window_days: number
  disbursed_at: string | null
  created_at: string
}

export interface RepaymentResponse {
  id: number
  loan_id: number
  amount_naira: number
  squad_webhook_ref: string | null
  created_at: string
}

export interface SaveAccountResponse {
  id: number
  trader_id: number
  balance_kobo: number
  balance_naira: number
  sweep_percentage: number
  is_active: boolean
}

// ── Matching ──────────────────────────────────────────────────
export type JobStatus = 'open' | 'matched' | 'in_progress' | 'completed' | 'cancelled'
export type MatchStatus = 'suggested' | 'accepted' | 'rejected' | 'completed'

export interface OpportunityResponse {
  id: number
  trader_id: number
  title: string
  description: string | null
  daily_pay: number
  duration_days: number
  total_pay: number
  location: string
  language_required: string | null
  skills_required: string[] | null
  status: JobStatus
  applicant_count: number
  created_at: string
}

export interface OpportunityFeedItem {
  id: number
  title: string
  description: string | null
  daily_pay: number
  duration_days: number
  total_pay: number
  location: string
  language_required: string | null
  skills_required: string[] | null
  trader_business_name: string | null
  trader_location: string | null
  status: JobStatus
  already_applied: boolean
  my_match_score: number | null
  created_at: string
}

export interface MatchResponse {
  id: number
  opportunity_id: number
  job_seeker_id: number
  match_score: number | null
  match_reasoning: string | null
  engine_used: string | null
  status: MatchStatus
  squad_payout_ref: string | null
  paid_at: string | null
  created_at: string
  // Job seeker contact
  job_seeker_name: string | null
  job_seeker_location: string | null
  job_seeker_skills: string[] | null
  job_seeker_languages: string[] | null
  job_seeker_daily_rate: number | null
  job_seeker_phone: string | null
  // Trader contact (for seeker view after being accepted)
  trader_full_name: string | null
  trader_phone: string | null
  trader_business_name: string | null
  // Opportunity info
  opportunity_title: string | null
}

export interface ApplicantRankedResponse {
  match_id: number
  job_seeker_id: number
  job_seeker_name: string | null
  job_seeker_location: string | null
  job_seeker_skills: string[] | null
  job_seeker_languages: string[] | null
  job_seeker_daily_rate: number | null
  job_seeker_phone: string | null
  match_score: number | null
  match_reasoning: string | null
  engine_used: string | null
  status: MatchStatus
}

export interface CompleteJobResponse {
  match_id: number
  opportunity_title: string
  job_seeker_name: string | null
  total_pay_naira: number
  platform_fee_naira: number
  total_charged_naira: number
  payout_reference: string | null
  payout_status: string
  message: string
}

export interface SeekerProfileResponse {
  job_seeker_id: number
  name: string | null
  location: string | null
  skills: string[] | null
  languages: string[] | null
  daily_rate_expectation: number | null
  jobs_completed: number
  jobs_accepted: number
  avg_rating: number
  completion_rate: number
  reliability_label: string
}
