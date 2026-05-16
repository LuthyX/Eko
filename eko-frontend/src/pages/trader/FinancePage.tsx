import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Zap, CheckCircle, AlertCircle, Info,
  TrendingUp, ChevronDown, ChevronUp, AlertTriangle, Settings,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { scoreApi, creditApi, walletApi } from '@/api'
import { formatNaira, formatDate, getScoreColor } from '@/utils'
import { Card, Badge, Button, ProgressBar, Spinner, BottomSheet } from '@/components/ui'
import ScoreRing from '@/components/shared/ScoreRing'
import type {
  EkoScoreResponse, EkoScoreHistoryItem,
  CreditEligibilityResponse, LoanResponse,
} from '@/types'

// ── Signal descriptions ───────────────────────────────────────────────────────

const SIGNAL_DESCRIPTIONS: Record<string, string> = {
  transaction_volume: 'Total Squad receipts over 90 days',
  tenure_recency: "How long & how recently you've been active",
  cohort_comparison: 'Your performance vs peers in your category',
  behavioural_stability: 'Consistency of your transaction patterns',
  identity_tier: 'BVN/NIN verification level',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const { traderProfile } = useAuth()
  const navigate = useNavigate()

  // Score
  const [score, setScore] = useState<EkoScoreResponse | null>(null)
  const [history, setHistory] = useState<EkoScoreHistoryItem[]>([])
  const [scoreExpanded, setScoreExpanded] = useState(false)

  // Credit
  const [eligibility, setEligibility] = useState<CreditEligibilityResponse | null>(null)
  const [activeLoan, setActiveLoan] = useState<LoanResponse | null>(null)
  const [loanHistory, setLoanHistory] = useState<LoanResponse[]>([])

  const [loading, setLoading] = useState(true)

  // Apply sheet
  const [applySheet, setApplySheet] = useState(false)
  const [amount, setAmount] = useState(50000)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')

  // Repay sheet
  const [repaySheet, setRepaySheet] = useState(false)
  const [repayAmount, setRepayAmount] = useState('')
  const [repaying, setRepaying] = useState(false)
  const [repayError, setRepayError] = useState('')

  // Sweep rate sheet
  const [sweepSheet, setSweepSheet] = useState(false)
  const [sweepValue, setSweepValue] = useState(10)
  const [updatingSweep, setUpdatingSweep] = useState(false)
  const [sweepError, setSweepError] = useState('')

  const load = useCallback(async () => {
    if (!traderProfile) return
    try {
      const [s, h, el, al, hist] = await Promise.allSettled([
        scoreApi.getScore(traderProfile.id),
        scoreApi.getHistory(traderProfile.id),
        creditApi.getEligibility(),
        creditApi.getActiveLoan(),
        creditApi.getLoanHistory(),
      ])
      if (s.status === 'fulfilled') setScore(s.value)
      if (h.status === 'fulfilled') setHistory(h.value.reverse())
      if (el.status === 'fulfilled') setEligibility(el.value)
      if (al.status === 'fulfilled') setActiveLoan(al.value)
      if (hist.status === 'fulfilled') setLoanHistory(hist.value)
    } finally {
      setLoading(false)
    }
  }, [traderProfile])

  useEffect(() => { load() }, [load])

  // ── Apply for credit ──────────────────────────────────────────────────────

  const handleApply = async () => {
    setApplyError('')
    setApplying(true)
    try {
      await creditApi.apply(amount)
      setApplySheet(false)
      // Loan is now immediately active — reload everything including wallet
      await Promise.all([load(), walletApi.getWallet()])
    } catch (err: any) {
      setApplyError(err?.response?.data?.detail || 'Application failed. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  // ── Manual repayment ──────────────────────────────────────────────────────

  const handleRepay = async () => {
    const amt = parseInt(repayAmount)
    if (!amt || amt < 100) { setRepayError('Minimum repayment is ₦100'); return }
    if (activeLoan && amt > activeLoan.outstanding_naira) {
      setRepayAmount(String(Math.floor(activeLoan.outstanding_naira)))
      return
    }
    setRepayError('')
    setRepaying(true)
    try {
      await creditApi.repay(amt)
      setRepaySheet(false)
      setRepayAmount('')
      setRepayError('')
      await load()
    } catch (err: any) {
      setRepayError(err?.response?.data?.detail || 'Repayment failed')
    } finally {
      setRepaying(false)
    }
  }

  // ── Update sweep rate ─────────────────────────────────────────────────────

  const handleUpdateSweepRate = async () => {
    setSweepError('')
    setUpdatingSweep(true)
    try {
      const updated = await creditApi.updateSweepRate(sweepValue)
      setActiveLoan(updated)
      setSweepSheet(false)
    } catch (err: any) {
      setSweepError(err?.response?.data?.detail || 'Failed to update sweep rate')
    } finally {
      setUpdatingSweep(false)
    }
  }

  // ── Open sweep sheet pre-filled with current rate ─────────────────────────

  const openSweepSheet = () => {
    setSweepValue(activeLoan?.sweep_rate_pct || 10)
    setSweepError('')
    setSweepSheet(true)
  }

  const loanRepaidPct = activeLoan
    ? Math.min(
        ((activeLoan.total_repayable_naira - activeLoan.outstanding_naira) / activeLoan.total_repayable_naira) * 100,
        100
      )
    : 0

  const chartData = history.map(h => ({
    date: new Date(h.computed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
    score: Math.round(h.score),
  }))

  // Use eligibility.max_advance_naira as the single source of truth for max advance
  const maxAdvance = eligibility?.max_advance_naira || 0

  // Over-window warning: estimated repayment > repayment window
  const overWindow = eligibility?.terms?.over_window_warning === true

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
      <Spinner size={32} />
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-content stagger" style={{ paddingTop: 20, paddingBottom: 32 }}>

      {/* ── Page title ──────────────────────────────────────────────────── */}
      <div className="animate-fade-in-up" style={{ padding: '0 2px', marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Finance</h1>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 2 }}>
          Your EkoScore and working capital
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — EkoScore                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <p className="section-title" style={{ marginBottom: 10 }}>EkoScore</p>

      {score ? (
        <>
          {/* Score summary card */}
          <Card className="animate-fade-in-up" style={{ marginBottom: 10 }}>
            <div style={{ padding: '20px' }}>
              {/* Ring + headline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                <ScoreRing score={score.score} size={88} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    <Badge variant={score.risk_tier === 'A' ? 'green' : score.risk_tier === 'B' ? 'amber' : 'red'}>
                      Tier {score.risk_tier}
                    </Badge>
                    {score.is_cold_start && <Badge variant="gray">Cold Start</Badge>}
                    {score.credit_eligible && <Badge variant="green">Credit Eligible</Badge>}
                  </div>
                  {score.credit_eligible ? (
                    <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.4 }}>
                      Qualifies for up to{' '}
                      <strong style={{ color: 'var(--g)' }}>{formatNaira(maxAdvance, true)}</strong>
                      {' '}working capital
                    </p>
                  ) : score.is_cold_start ? (
                    <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.4 }}>
                      Keep transacting via Squad to build your score
                    </p>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.4 }}>
                      Need <strong>{Math.max(0, 60 - score.score).toFixed(0)}</strong> more points for EkoCredit
                    </p>
                  )}
                </div>
              </div>

              {/* Score-to-threshold progress (only when not eligible) */}
              {!score.credit_eligible && !score.is_cold_start && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--t3)' }}>Current: {score.score.toFixed(0)}</span>
                    <span style={{ fontSize: 11, color: 'var(--t3)' }}>EkoCredit threshold: 60</span>
                  </div>
                  <ProgressBar value={score.score} max={100} color="var(--a)" height={6} />
                </div>
              )}

              {/* Expand/collapse SHAP breakdown */}
              <button
                onClick={() => setScoreExpanded(e => !e)}
                style={{
                  background: 'var(--s1)', border: '1px solid var(--bd)',
                  borderRadius: 8, padding: '8px 14px', width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13,
                  fontWeight: 600, color: 'var(--t1)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Info size={14} />
                  Score breakdown
                </span>
                {scoreExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {/* SHAP breakdown (collapsible) */}
            {scoreExpanded && score.shap_values && (
              <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--bd)' }}>
                <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {Object.entries(score.shap_values).map(([key, signal]) => {
                    const rawScore = (score as any)[`${key}_score`] as number | null
                    return (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600 }}>{signal.label}</p>
                            <p style={{ fontSize: 11, color: 'var(--t3)' }}>{SIGNAL_DESCRIPTIONS[key]}</p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                            <p style={{ fontSize: 15, fontWeight: 800, color: getScoreColor(rawScore || 0) }}>
                              {rawScore != null ? rawScore.toFixed(0) : '—'}
                            </p>
                            <p style={{ fontSize: 10, color: 'var(--t3)' }}>{(signal.weight * 100).toFixed(0)}% weight</p>
                          </div>
                        </div>
                        <ProgressBar value={rawScore || 0} color={getScoreColor(rawScore || 0)} height={5} />
                      </div>
                    )
                  })}
                </div>
                <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginTop: 16 }}>
                  Last computed {formatDate(score.computed_at)}
                </p>
              </div>
            )}
          </Card>

          {/* Score history chart */}
          {chartData.length > 1 && (
            <Card className="animate-fade-in-up" style={{ marginBottom: 20 }}>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <TrendingUp size={14} color="var(--g)" />
                  <p style={{ fontSize: 13, fontWeight: 700 }}>Score History</p>
                </div>
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--t3)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--t3)' }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip
                      contentStyle={{ background: 'var(--t0)', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' }}
                      itemStyle={{ color: 'var(--g)' }}
                    />
                    <Line
                      type="monotone" dataKey="score"
                      stroke="var(--g)" strokeWidth={2.5}
                      dot={{ fill: 'var(--g)', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="animate-fade-in-up" style={{ marginBottom: 20 }}>
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--t2)' }}>No score yet</p>
            <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>
              Link your Squad account and start transacting to get scored
            </p>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — EkoCredit                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <p className="section-title" style={{ marginBottom: 10 }}>EkoCredit</p>

      {/* ── Active loan — ALWAYS shown when one exists ─────────────────── */}
      {activeLoan && (
        <Card
          className="animate-fade-in-up"
          style={{
            marginBottom: 12,
            background: 'linear-gradient(135deg, #0F0F0E 0%, #1e2420 100%)',
            borderColor: 'transparent',
          }}
        >
          <div style={{ padding: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Outstanding Balance
                </p>
                <p style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {formatNaira(activeLoan.outstanding_naira)}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  of {formatNaira(activeLoan.total_repayable_naira)} total
                </p>
              </div>
              <div style={{ background: 'rgba(245,166,35,0.2)', border: '1px solid rgba(245,166,35,0.4)', borderRadius: 8, padding: '4px 10px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--a)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {activeLoan.status === 'pending' ? 'Processing' : 'Repaying'}
                </p>
              </div>
            </div>

            {/* Repayment progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${loanRepaidPct}%`, height: '100%',
                  background: 'linear-gradient(90deg, var(--g2), var(--g))',
                  borderRadius: 999,
                  transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {loanRepaidPct.toFixed(0)}% repaid
                </p>
                <button
                  onClick={openSweepSheet}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4, padding: 0,
                  }}
                >
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                    {activeLoan.sweep_rate_pct}% auto-sweep
                  </p>
                  <Settings size={10} color="rgba(255,255,255,0.4)" />
                </button>
              </div>
            </div>

            {/* Loan details table */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              {[
                ['Loan amount', formatNaira(activeLoan.amount_naira)],
                ['Platform fee (5%)', formatNaira(activeLoan.fee_amount_naira)],
                ['Total repayable', formatNaira(activeLoan.total_repayable_naira)],
                ['Disbursed', activeLoan.disbursed_at ? formatDate(activeLoan.disbursed_at) : '—'],
                ['Repayment window', `${activeLoan.repayment_window_days} days`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{k}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={openSweepSheet}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, padding: '12px 16px', color: 'rgba(255,255,255,0.8)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Settings size={14} />
                Sweep rate
              </button>
              <button
                onClick={() => setRepaySheet(true)}
                style={{
                  background: 'var(--g)', border: 'none',
                  borderRadius: 10, padding: '12px 16px', color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--font)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 4px 20px rgba(0,200,150,0.3)',
                }}
              >
                <Zap size={14} />
                Repay now
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Eligibility / apply section — shown regardless of active loan ─ */}
      {eligibility && (
        <Card className="animate-fade-in-up" style={{ marginBottom: 12 }}>
          <div style={{ padding: '20px' }}>
            {eligibility.eligible ? (
              <>
                {/* Eligible header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--g)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={24} color="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
                      {activeLoan ? 'New advance available after repayment' : 'You qualify for EkoCredit'}
                    </p>
                    <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--g)', letterSpacing: '-0.02em' }}>
                      Up to {formatNaira(maxAdvance)}
                    </p>
                  </div>
                  <Badge variant="green">Eligible</Badge>
                </div>

                {/* Loan terms */}
                {eligibility.terms && (
                  <div style={{ background: 'var(--gl)', borderRadius: 'var(--r-sm)', padding: '14px', marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--g2)', marginBottom: 10 }}>Loan terms</p>
                    {[
                      ['Minimum sweep rate', `${eligibility.terms.minimum_sweep_rate_pct}% of each incoming payment`],
                      ['Repayment window', `${eligibility.terms.repayment_window_days} days`],
                      ['Early repayment penalty', eligibility.terms.early_repayment_penalty],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <p style={{ fontSize: 13, color: 'var(--g3)' }}>{k}</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--g2)' }}>{v}</p>
                      </div>
                    ))}

                    {/* Estimated repayment — shown separately with context */}
                    <div style={{ borderTop: '1px solid var(--gm)', paddingTop: 10, marginTop: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <p style={{ fontSize: 13, color: 'var(--g3)' }}>Estimated repayment</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: overWindow ? 'var(--a2)' : 'var(--g2)' }}>
                          ~{eligibility.terms.estimated_repayment_days} days
                        </p>
                      </div>
                      {overWindow && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8, background: 'var(--al)', borderRadius: 8, padding: '8px 10px' }}>
                          <AlertTriangle size={13} color="var(--a2)" style={{ flexShrink: 0, marginTop: 1 }} />
                          <p style={{ fontSize: 12, color: 'var(--a2)', lineHeight: 1.5 }}>
                            Based on your current transaction volume, repayment may exceed the 90-day window.
                            Consider requesting a higher sweep rate to stay on track.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Apply button — disabled if active loan exists */}
                {activeLoan ? (
                  <div style={{ background: 'var(--s1)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertCircle size={16} color="var(--t3)" />
                    <p style={{ fontSize: 13, color: 'var(--t2)' }}>
                      Repay your current loan to apply for a new advance
                    </p>
                  </div>
                ) : (
                  <Button onClick={() => setApplySheet(true)}>
                    Apply for advance
                  </Button>
                )}
              </>
            ) : (
              /* Not eligible — but still show the reason clearly */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertCircle size={24} color="var(--t2)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Not eligible yet</p>
                    <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.4 }}>
                      {eligibility.reason || 'Complete more transactions to qualify'}
                    </p>
                  </div>
                </div>
                {/* Score progress toward threshold — only when reason is score-related */}
                {eligibility.score != null && !activeLoan && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--t3)' }}>Your score: {eligibility.score.toFixed(0)}</span>
                      <span style={{ fontSize: 12, color: 'var(--t3)' }}>Threshold: {eligibility.threshold}</span>
                    </div>
                    <ProgressBar value={eligibility.score} max={100} color="var(--a)" height={6} />
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Loan history ───────────────────────────────────────────────── */}
      {loanHistory.length > 0 && (
        <div className="animate-fade-in-up" style={{ marginTop: 4 }}>
          <p className="section-title" style={{ marginBottom: 10 }}>Loan History</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loanHistory.map(loan => {
              const repaidPct = loan.total_repayable_naira > 0
                ? Math.min(
                    ((loan.total_repayable_naira - loan.outstanding_naira) / loan.total_repayable_naira) * 100,
                    100
                  )
                : 0
              return (
                <Card key={loan.id}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 700 }}>{formatNaira(loan.amount_naira)}</p>
                        <p style={{ fontSize: 12, color: 'var(--t2)' }}>
                          {loan.disbursed_at ? formatDate(loan.disbursed_at) : formatDate(loan.created_at)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <Badge variant={loan.status === 'repaid' ? 'green' : loan.status === 'active' ? 'amber' : loan.status === 'pending' ? 'blue' : 'red'}>
                          {loan.status}
                        </Badge>
                        {loan.status === 'repaid' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={11} color="var(--g)" />
                            <p style={{ fontSize: 11, color: 'var(--g)', fontWeight: 600 }}>Fully repaid</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {loan.status === 'active' && (
                      <ProgressBar value={repaidPct} color="var(--g)" height={4} />
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Apply sheet ─────────────────────────────────────────────────── */}
      <BottomSheet open={applySheet} onClose={() => { setApplySheet(false); setApplyError('') }} title="Apply for EkoCredit">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <p className="input-label">Loan amount</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--g)', letterSpacing: '-0.02em' }}>
                {formatNaira(amount)}
              </p>
            </div>
            <input
              type="range"
              min={5000}
              max={maxAdvance || 500000}
              step={5000}
              value={amount}
              onChange={e => setAmount(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--g)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <p style={{ fontSize: 11, color: 'var(--t3)' }}>₦5,000 min</p>
              <p style={{ fontSize: 11, color: 'var(--t3)' }}>{formatNaira(maxAdvance || 500000)} max</p>
            </div>
          </div>

          {/* Breakdown */}
          <div style={{ background: 'var(--s1)', borderRadius: 'var(--r-sm)', padding: '14px' }}>
            {[
              ['You receive', formatNaira(amount), 'var(--g)'],
              ['Platform fee (5%)', formatNaira(Math.round(amount * 0.05)), 'var(--t0)'],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 13, color: 'var(--t2)' }}>{k}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</p>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--bd)', margin: '4px 0 10px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, fontWeight: 700 }}>Total repayable</p>
              <p style={{ fontSize: 16, fontWeight: 900 }}>{formatNaira(Math.round(amount * 1.05))}</p>
            </div>
          </div>

          {/* Sweep reminder */}
          {eligibility?.terms && (
            <div style={{ display: 'flex', gap: 8, background: 'var(--gl)', borderRadius: 8, padding: '10px 12px' }}>
              <Info size={14} color="var(--g2)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: 'var(--g3)', lineHeight: 1.5 }}>
                {eligibility.terms.minimum_sweep_rate_pct}% of every incoming Squad payment will be automatically swept toward repayment.
              </p>
            </div>
          )}

          {applyError && (
            <p style={{ fontSize: 13, color: 'var(--r)', background: 'var(--rl)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>
              {applyError}
            </p>
          )}

          <Button onClick={handleApply} loading={applying}>
            Confirm — get {formatNaira(amount)}
          </Button>
        </div>
      </BottomSheet>

      {/* ── Repay sheet ─────────────────────────────────────────────────── */}
      <BottomSheet
        open={repaySheet}
        onClose={() => { setRepaySheet(false); setRepayAmount(''); setRepayError('') }}
        title="Repay Loan"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Outstanding */}
          <div style={{ background: 'var(--s1)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Outstanding
            </p>
            <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--t0)', letterSpacing: '-0.02em' }}>
              {formatNaira(activeLoan?.outstanding_naira || 0)}
            </p>
          </div>

          {/* Quick amount buttons */}
          {activeLoan && (
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: '25%', value: Math.round(activeLoan.outstanding_naira * 0.25) },
                { label: '50%', value: Math.round(activeLoan.outstanding_naira * 0.5) },
                { label: 'Full', value: Math.floor(activeLoan.outstanding_naira) },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setRepayAmount(String(opt.value))}
                  style={{
                    flex: 1, padding: '8px 0',
                    background: repayAmount === String(opt.value) ? 'var(--gl)' : 'var(--s1)',
                    border: `1.5px solid ${repayAmount === String(opt.value) ? 'var(--g)' : 'var(--bd2)'}`,
                    borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font)',
                    fontSize: 13, fontWeight: 600,
                    color: repayAmount === String(opt.value) ? 'var(--g2)' : 'var(--t1)',
                  }}
                >
                  {opt.label}
                  <br />
                  <span style={{ fontSize: 11, fontWeight: 400 }}>{formatNaira(opt.value, true)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Or enter amount (₦)</label>
            <input
              className="input"
              type="number"
              placeholder="e.g. 10000"
              value={repayAmount}
              onChange={e => setRepayAmount(e.target.value)}
              min={100}
              max={activeLoan?.outstanding_naira}
            />
          </div>

          {repayError && (
            <p style={{ fontSize: 13, color: 'var(--r)', background: 'var(--rl)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>
              {repayError}
            </p>
          )}

          <Button onClick={handleRepay} loading={repaying} disabled={!repayAmount}>
            Repay {repayAmount ? formatNaira(parseInt(repayAmount)) : 'now'}
          </Button>

          <p style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center' }}>
            Repayments are instant and deducted from your wallet balance
          </p>
        </div>
      </BottomSheet>

      {/* ── Sweep rate sheet ─────────────────────────────────────────────── */}
      <BottomSheet
        open={sweepSheet}
        onClose={() => { setSweepSheet(false); setSweepError('') }}
        title="Adjust Sweep Rate"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* What sweep rate means */}
          <div style={{ background: 'var(--gl)', borderRadius: 10, padding: '14px' }}>
            <p style={{ fontSize: 13, color: 'var(--g3)', lineHeight: 1.6 }}>
              Every time money lands in your Eko wallet, <strong>{sweepValue}%</strong> is automatically
              swept toward your loan repayment. A higher rate means you repay faster.
            </p>
          </div>

          {/* Current rate info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Current rate
              </p>
              <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--t0)' }}>
                {activeLoan?.sweep_rate_pct}%
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                New rate
              </p>
              <p style={{ fontSize: 22, fontWeight: 900, color: sweepValue > (activeLoan?.sweep_rate_pct || 0) ? 'var(--g)' : 'var(--t0)' }}>
                {sweepValue}%
              </p>
            </div>
          </div>

          {/* Slider */}
          <div>
            <input
              type="range"
              min={activeLoan?.sweep_rate_pct || 10}
              max={50}
              step={1}
              value={sweepValue}
              onChange={e => setSweepValue(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--g)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <p style={{ fontSize: 11, color: 'var(--t3)' }}>
                {activeLoan?.sweep_rate_pct}% (your minimum)
              </p>
              <p style={{ fontSize: 11, color: 'var(--t3)' }}>50% max</p>
            </div>
          </div>

          {/* Impact preview */}
          {activeLoan && (
            <div style={{ background: 'var(--s1)', borderRadius: 10, padding: '14px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', marginBottom: 10 }}>
                What this means for a ₦{(50000).toLocaleString()} incoming payment
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ fontSize: 13, color: 'var(--t2)' }}>Swept to loan</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--g)' }}>
                  {formatNaira(50000 * sweepValue / 100)}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13, color: 'var(--t2)' }}>Stays in wallet</p>
                <p style={{ fontSize: 13, fontWeight: 700 }}>
                  {formatNaira(50000 * (100 - sweepValue) / 100)}
                </p>
              </div>
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>
            You can only increase your sweep rate, not decrease it below your score-tier minimum.
          </p>

          {sweepError && (
            <p style={{ fontSize: 13, color: 'var(--r)', background: 'var(--rl)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>
              {sweepError}
            </p>
          )}

          <Button
            onClick={handleUpdateSweepRate}
            loading={updatingSweep}
            disabled={sweepValue === activeLoan?.sweep_rate_pct}
          >
            Set sweep rate to {sweepValue}%
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
