import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { creditApi } from '@/api'
import { formatNaira, formatDate } from '@/utils'
import { Card, Badge, Button, ProgressBar, Spinner, PageHeader, BottomSheet } from '@/components/ui'
import type { CreditEligibilityResponse, LoanResponse } from '@/types'

export default function CreditPage() {
  const { traderProfile } = useAuth()
  const navigate = useNavigate()
  const [eligibility, setEligibility] = useState<CreditEligibilityResponse | null>(null)
  const [activeLoan, setActiveLoan] = useState<LoanResponse | null>(null)
  const [loanHistory, setLoanHistory] = useState<LoanResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [applySheet, setApplySheet] = useState(false)
  const [amount, setAmount] = useState(50000)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [repaySheet, setRepaySheet] = useState(false)
  const [repayAmount, setRepayAmount] = useState('')
  const [repaying, setRepaying] = useState(false)

  const load = useCallback(async () => {
    try {
      const [el, al, hist] = await Promise.allSettled([
        creditApi.getEligibility(),
        creditApi.getActiveLoan(),
        creditApi.getLoanHistory(),
      ])
      if (el.status === 'fulfilled') setEligibility(el.value)
      if (al.status === 'fulfilled') setActiveLoan(al.value)
      if (hist.status === 'fulfilled') setLoanHistory(hist.value)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleApply = async () => {
    setApplyError('')
    setApplying(true)
    try {
      await creditApi.apply(amount)
      setApplySheet(false)
      // Poll for active status
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const loan = await creditApi.getActiveLoan()
        if (loan?.status === 'active' || attempts > 10) {
          clearInterval(poll)
          setActiveLoan(loan)
          load()
        }
      }, 2000)
    } catch (err: any) {
      setApplyError(err?.response?.data?.detail || 'Application failed')
    } finally {
      setApplying(false)
    }
  }

  const handleRepay = async () => {
    if (!repayAmount) return
    setRepaying(true)
    try {
      await creditApi.repay(parseInt(repayAmount))
      setRepaySheet(false)
      setRepayAmount('')
      load()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Repayment failed')
    } finally {
      setRepaying(false)
    }
  }

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={32} /></div>

  const loanRepaidPct = activeLoan
    ? ((activeLoan.total_repayable_naira - activeLoan.outstanding_naira) / activeLoan.total_repayable_naira) * 100
    : 0

  return (
    <div className="page-content stagger" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <PageHeader title="EkoCredit" subtitle="Working capital for your business" back={() => navigate(-1)} />

      {/* Active loan */}
      {activeLoan && (
        <Card className="animate-fade-in-up" style={{ marginTop: 20, marginBottom: 12 }}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>OUTSTANDING</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--t0)', letterSpacing: '-0.03em' }}>{formatNaira(activeLoan.outstanding_naira)}</p>
                <p style={{ fontSize: 12, color: 'var(--t2)' }}>of {formatNaira(activeLoan.total_repayable_naira)} total</p>
              </div>
              <Badge variant="amber">Active</Badge>
            </div>

            <ProgressBar value={loanRepaidPct} color="var(--g)" height={8} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <p style={{ fontSize: 11, color: 'var(--t3)' }}>{loanRepaidPct.toFixed(0)}% repaid</p>
              <p style={{ fontSize: 11, color: 'var(--t3)' }}>{activeLoan.sweep_rate_pct}% auto-sweep</p>
            </div>

            <div style={{ background: 'var(--s1)', borderRadius: 'var(--r-sm)', padding: '12px', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Loan amount', formatNaira(activeLoan.amount_naira)],
                ['Platform fee (5%)', formatNaira(activeLoan.fee_amount_naira)],
                ['Total repayable', formatNaira(activeLoan.total_repayable_naira)],
                ['Disbursed', activeLoan.disbursed_at ? formatDate(activeLoan.disbursed_at) : 'Pending'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 13, color: 'var(--t2)' }}>{k}</p>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{v}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <Button variant="secondary" onClick={() => setRepaySheet(true)}>
                Repay manually
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Eligibility card */}
      {!activeLoan && eligibility && (
        <Card className="animate-fade-in-up" style={{ marginTop: 20, marginBottom: 12 }}>
          <div style={{ padding: '20px' }}>
            {eligibility.eligible ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--g)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={24} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700 }}>You qualify for EkoCredit</p>
                    <p style={{ fontSize: 13, color: 'var(--t2)' }}>Up to {formatNaira(eligibility.max_advance_naira || 0)}</p>
                  </div>
                  <Badge variant="green">Eligible</Badge>
                </div>

                {eligibility.terms && (
                  <div style={{ background: 'var(--gl)', borderRadius: 'var(--r-sm)', padding: '14px', marginBottom: 20 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--g2)', marginBottom: 10 }}>Loan terms</p>
                    {[
                      ['Minimum sweep rate', `${eligibility.terms.minimum_sweep_rate_pct}% per payment`],
                      ['Repayment window', `${eligibility.terms.repayment_window_days} days`],
                      ['Early repayment penalty', eligibility.terms.early_repayment_penalty],
                      ['Estimated repayment', `~${eligibility.terms.estimated_repayment_days} days`],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <p style={{ fontSize: 13, color: 'var(--g3)' }}>{k}</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--g2)' }}>{v}</p>
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={() => setApplySheet(true)}>
                  Apply for advance
                </Button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <AlertCircle size={40} color="var(--t3)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Not eligible yet</p>
                <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5, marginBottom: 20 }}>{eligibility.reason}</p>
                {eligibility.score != null && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--t3)' }}>Your score: {eligibility.score.toFixed(0)}</span>
                      <span style={{ fontSize: 12, color: 'var(--t3)' }}>Target: {eligibility.threshold}</span>
                    </div>
                    <ProgressBar value={eligibility.score} max={100} color="var(--a)" />
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Loan history */}
      {loanHistory.length > 0 && (
        <div className="animate-fade-in-up" style={{ marginTop: 8 }}>
          <p className="section-title" style={{ marginBottom: 10 }}>Loan History</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loanHistory.map(loan => (
              <Card key={loan.id}>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <p style={{ fontSize: 15, fontWeight: 700 }}>{formatNaira(loan.amount_naira)}</p>
                    <Badge variant={loan.status === 'repaid' ? 'green' : loan.status === 'active' ? 'amber' : 'red'}>
                      {loan.status}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 12, color: 'var(--t2)' }}>
                      {loan.disbursed_at ? formatDate(loan.disbursed_at) : formatDate(loan.created_at)}
                    </p>
                    {loan.status === 'repaid' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} color="var(--g)" />
                        <p style={{ fontSize: 12, color: 'var(--g)', fontWeight: 600 }}>Fully repaid</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Apply sheet */}
      <BottomSheet open={applySheet} onClose={() => setApplySheet(false)} title="Apply for EkoCredit">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <p className="input-label">Loan amount</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--g)' }}>{formatNaira(amount)}</p>
            </div>
            <input
              type="range"
              min={5000}
              max={eligibility?.max_advance_naira || 500000}
              step={5000}
              value={amount}
              onChange={e => setAmount(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--g)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <p style={{ fontSize: 11, color: 'var(--t3)' }}>₦5,000 min</p>
              <p style={{ fontSize: 11, color: 'var(--t3)' }}>{formatNaira(eligibility?.max_advance_naira || 500000)} max</p>
            </div>
          </div>

          <div style={{ background: 'var(--s1)', borderRadius: 'var(--r-sm)', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--t2)' }}>You receive</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--g)' }}>{formatNaira(amount)}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--t2)' }}>Platform fee (5%)</p>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{formatNaira(Math.round(amount * 0.05))}</p>
            </div>
            <div style={{ height: 1, background: 'var(--bd)', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, fontWeight: 700 }}>Total repayable</p>
              <p style={{ fontSize: 14, fontWeight: 800 }}>{formatNaira(Math.round(amount * 1.05))}</p>
            </div>
          </div>

          {applyError && (
            <p style={{ fontSize: 13, color: 'var(--r)', background: 'var(--rl)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>{applyError}</p>
          )}

          <Button onClick={handleApply} loading={applying}>
            Confirm — apply for {formatNaira(amount)}
          </Button>
        </div>
      </BottomSheet>

      {/* Repay sheet */}
      <BottomSheet open={repaySheet} onClose={() => setRepaySheet(false)} title="Manual Repayment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--t2)' }}>
            Outstanding: <strong>{formatNaira(activeLoan?.outstanding_naira || 0)}</strong>
          </p>
          <div className="input-group">
            <label className="input-label">Amount (₦)</label>
            <input
              className="input"
              type="number"
              placeholder="Enter amount"
              value={repayAmount}
              onChange={e => setRepayAmount(e.target.value)}
              min={100}
            />
          </div>
          <Button onClick={handleRepay} loading={repaying}>
            Repay {repayAmount ? formatNaira(parseInt(repayAmount)) : 'now'}
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
