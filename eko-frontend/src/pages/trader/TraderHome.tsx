import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, TrendingUp, Zap, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { scoreApi, walletApi, creditApi, matchApi } from '@/api'
import { formatNaira, getScoreColor } from '@/utils'
import { Card, Badge, ProgressBar, Spinner, Avatar, BottomSheet, Button, Input } from '@/components/ui'
import type { EkoScoreResponse, WalletResponse, CreditEligibilityResponse, LoanResponse, OpportunityResponse } from '@/types'
import ScoreRing from '@/components/shared/ScoreRing'

const BANK_CODES = [
  { code: '000013', name: 'GTBank' },
  { code: '000014', name: 'Access Bank' },
  { code: '000015', name: 'Zenith Bank' },
  { code: '000016', name: 'First Bank' },
  { code: '000004', name: 'UBA' },
  { code: '000017', name: 'Wema Bank' },
  { code: '090267', name: 'Kuda' },
  { code: '100004', name: 'OPay' },
  { code: '100033', name: 'PalmPay' },
  { code: '090405', name: 'Moniepoint' },
]

export default function TraderHome() {
  const { user, traderProfile } = useAuth()
  const navigate = useNavigate()

  const [score, setScore] = useState<EkoScoreResponse | null>(null)
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [eligibility, setEligibility] = useState<CreditEligibilityResponse | null>(null)
  const [activeLoan, setActiveLoan] = useState<LoanResponse | null>(null)
  const [myJobs, setMyJobs] = useState<OpportunityResponse[]>([])
  const [loading, setLoading] = useState(true)

  // Withdraw sheet
  const [withdrawSheet, setWithdrawSheet] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({ amount_naira: '', bank_code: '000013', account_number: '', account_name: '' })
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)

  useEffect(() => {
    if (!traderProfile) return
    const load = async () => {
      try {
        const [w, s, el, al, jobs] = await Promise.allSettled([
          walletApi.getWallet(),
          scoreApi.getScore(traderProfile.id),
          creditApi.getEligibility(),
          creditApi.getActiveLoan(),
          matchApi.getMyOpportunities(),
        ])
        if (w.status === 'fulfilled') setWallet(w.value)
        if (s.status === 'fulfilled') setScore(s.value)
        if (el.status === 'fulfilled') setEligibility(el.value)
        if (al.status === 'fulfilled') setActiveLoan(al.value)
        if (jobs.status === 'fulfilled') setMyJobs(jobs.value)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [traderProfile])

  const handleWithdraw = async () => {
    setWithdrawError('')
    const amount = parseInt(withdrawForm.amount_naira)
    if (!amount || amount < 1000) { setWithdrawError('Minimum withdrawal is ₦1,000'); return }
    if (withdrawForm.account_number.length !== 10) { setWithdrawError('Account number must be 10 digits'); return }
    if (!withdrawForm.account_name.trim()) { setWithdrawError('Enter account name'); return }
    setWithdrawing(true)
    try {
      await walletApi.withdraw({
        amount_naira: amount,
        bank_code: withdrawForm.bank_code,
        account_number: withdrawForm.account_number,
        account_name: withdrawForm.account_name,
      })
      setWithdrawSuccess(true)
      const w = await walletApi.getWallet()
      setWallet(w)
    } catch (err: any) {
      setWithdrawError(err?.response?.data?.detail || 'Withdrawal failed')
    } finally {
      setWithdrawing(false)
    }
  }

  const closeWithdraw = () => {
    setWithdrawSheet(false)
    setWithdrawSuccess(false)
    setWithdrawError('')
    setWithdrawForm({ amount_naira: '', bank_code: '000013', account_number: '', account_name: '' })
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <Spinner size={32} />
      </div>
    )
  }

  const loanRepaidPct = activeLoan
    ? ((activeLoan.total_repayable_naira - activeLoan.outstanding_naira) / activeLoan.total_repayable_naira) * 100
    : 0

  const openJobs = myJobs.filter(j => j.status === 'open').length

  return (
    <div className="page-content stagger" style={{ paddingTop: 20 }}>
      {/* Greeting header */}
      <div className="animate-fade-in-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={user?.full_name || 'T'} size={44} green />
          <div>
            <p style={{ fontSize: 13, color: 'var(--t2)' }}>{greeting()}</p>
            <h2 style={{ fontSize: 20, letterSpacing: '-0.02em' }}>{user?.full_name?.split(' ')[0]}</h2>
          </div>
        </div>
        <button
          style={{ background: 'var(--s0)', border: '1px solid var(--bd)', borderRadius: 12, padding: '10px', cursor: 'pointer' }}
          onClick={() => navigate('/trader/profile')}
        >
          <Bell size={20} color="var(--t1)" />
        </button>
      </div>

      {/* Wallet balance card */}
      <Card className="animate-fade-in-up" style={{ marginBottom: 12, background: 'var(--t0)', borderColor: 'transparent' }}>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: 4 }}>WALLET BALANCE</p>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
                {wallet ? formatNaira(wallet.balance_naira) : '—'}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--mono)', marginBottom: 4 }}>VIRTUAL ACCOUNT</p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--mono)' }}>{wallet?.virtual_account_number || '—'}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{wallet?.virtual_bank_name}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={() => navigate('/trader/wallet')}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              View history
            </button>
            <button
              onClick={() => setWithdrawSheet(true)}
              style={{ background: 'var(--g)', border: 'none', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              Withdraw
            </button>
          </div>
        </div>
      </Card>

      {/* EkoScore card */}
      <Card className="animate-fade-in-up" onClick={() => navigate('/trader/finance')} style={{ marginBottom: 12, cursor: 'pointer' }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRing score={score?.score || 0} size={72} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>EkoScore</p>
              {score && (
                <Badge variant={score.risk_tier === 'A' ? 'green' : score.risk_tier === 'B' ? 'amber' : 'red'}>
                  Tier {score.risk_tier}
                </Badge>
              )}
            </div>
            {score ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                {Object.entries(score.shap_values || {}).slice(0, 3).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 11, color: 'var(--t3)', width: 90, flexShrink: 0 }}>{v.label}</p>
                    <ProgressBar value={v.weight * 100} color={getScoreColor(score.score)} height={4} />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--t2)' }}>No score yet — link your Squad account</p>
            )}
          </div>
          <ChevronRight size={16} color="var(--t3)" />
        </div>
      </Card>

      {/* EkoCredit — eligible, no active loan */}
      {eligibility?.eligible && !activeLoan && (
        <Card
          className="animate-fade-in-up"
          style={{ marginBottom: 12, background: 'linear-gradient(135deg, var(--gl) 0%, #fff 100%)', borderColor: 'var(--gm)' }}
          onClick={() => navigate('/trader/finance')}
        >
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--g)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={20} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>EkoCredit available</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--g)', letterSpacing: '-0.02em' }}>
                    Up to {formatNaira(eligibility.max_advance_naira || 0, true)}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--g)' }}>Apply</span>
                <ChevronRight size={16} color="var(--g)" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Active loan repayment tracker */}
      {activeLoan && (
        <Card className="animate-fade-in-up" style={{ marginBottom: 12 }} onClick={() => navigate('/trader/finance')}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 700 }}>Active Loan</p>
              <Badge variant="amber">Repaying</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--t2)' }}>Outstanding</p>
              <p style={{ fontSize: 14, fontWeight: 700 }}>{formatNaira(activeLoan.outstanding_naira)}</p>
            </div>
            <ProgressBar value={loanRepaidPct} color="var(--g)" />
            <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>
              {loanRepaidPct.toFixed(0)}% repaid · {activeLoan.sweep_rate_pct}% auto-sweep active
            </p>
          </div>
        </Card>
      )}

      {/* My jobs quick view */}
      <div className="animate-fade-in-up" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p className="section-title">My Jobs</p>
          <button onClick={() => navigate('/trader/jobs')} style={{ fontSize: 13, color: 'var(--g)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            See all
          </button>
        </div>

        {myJobs.length === 0 ? (
          <Card>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Users size={32} color="var(--t3)" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>No jobs posted yet</p>
              <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 14 }}>Post a job to find workers nearby</p>
              <button onClick={() => navigate('/trader/jobs/new')} style={{ background: 'var(--g)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Post a job
              </button>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myJobs.slice(0, 3).map(job => (
              <Card key={job.id} onClick={() => navigate(`/trader/jobs/${job.id}/applicants`)} style={{ cursor: 'pointer' }}>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{job.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--t2)' }}>{formatNaira(job.daily_pay)}/day · {job.duration_days}d · {job.location.split(',')[0]}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <Badge variant={job.status === 'open' ? 'green' : job.status === 'in_progress' ? 'amber' : 'gray'}>
                      {job.status === 'open' ? 'Open' : job.status === 'in_progress' ? 'Active' : job.status}
                    </Badge>
                    {job.applicant_count > 0 && (
                      <p style={{ fontSize: 11, color: 'var(--g)', fontWeight: 600 }}>{job.applicant_count} applicant{job.applicant_count !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="animate-fade-in-up" style={{ marginBottom: 24 }}>
        <p className="section-title" style={{ marginBottom: 10 }}>Overview</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: 'var(--s0)', borderRadius: 'var(--r-md)', padding: '14px', border: '1px solid var(--bd)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <TrendingUp size={14} color="var(--g)" />
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score</p>
            </div>
            <p style={{ fontSize: 24, fontWeight: 800, color: score ? getScoreColor(score.score) : 'var(--t3)', letterSpacing: '-0.02em' }}>
              {score ? score.score.toFixed(0) : '—'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>/ 100</p>
          </div>
          <div style={{ background: 'var(--s0)', borderRadius: 'var(--r-md)', padding: '14px', border: '1px solid var(--bd)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Users size={14} color="var(--a)" />
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Open Jobs</p>
            </div>
            <p style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{openJobs}</p>
            <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>posted</p>
          </div>
        </div>
      </div>

      {/* Withdraw sheet */}
      <BottomSheet open={withdrawSheet} onClose={closeWithdraw} title="Withdraw Funds">
        {withdrawSuccess ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gl)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Zap size={28} color="var(--g)" />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Withdrawal initiated</p>
            <p style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.5 }}>
              {formatNaira(parseInt(withdrawForm.amount_naira))} is being transferred to your bank account. Usually arrives within minutes.
            </p>
            <Button onClick={closeWithdraw} style={{ marginTop: 24 }}>Done</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--s1)', borderRadius: 'var(--r-sm)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, color: 'var(--t2)' }}>Available balance</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--g)' }}>{formatNaira(wallet?.balance_naira || 0)}</p>
            </div>
            <Input
              label="Amount (₦)"
              type="number"
              placeholder="e.g. 50000"
              value={withdrawForm.amount_naira}
              onChange={e => setWithdrawForm(f => ({ ...f, amount_naira: e.target.value }))}
              min={1000}
            />
            <div className="input-group">
              <label className="input-label">Bank</label>
              <select
                className="input"
                value={withdrawForm.bank_code}
                onChange={e => setWithdrawForm(f => ({ ...f, bank_code: e.target.value }))}
                style={{ appearance: 'auto' }}
              >
                {BANK_CODES.map(b => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Account number"
              type="tel"
              placeholder="10-digit account number"
              value={withdrawForm.account_number}
              onChange={e => setWithdrawForm(f => ({ ...f, account_number: e.target.value }))}
              maxLength={10}
            />
            <Input
              label="Account name"
              placeholder="As it appears on your bank account"
              value={withdrawForm.account_name}
              onChange={e => setWithdrawForm(f => ({ ...f, account_name: e.target.value }))}
            />
            {withdrawError && (
              <p style={{ fontSize: 13, color: 'var(--r)', background: 'var(--rl)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>{withdrawError}</p>
            )}
            <Button onClick={handleWithdraw} loading={withdrawing}>
              Withdraw {withdrawForm.amount_naira ? formatNaira(parseInt(withdrawForm.amount_naira)) : 'now'}
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
