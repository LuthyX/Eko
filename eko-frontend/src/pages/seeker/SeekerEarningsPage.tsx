import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, ArrowDownLeft, ArrowUpRight, TrendingUp, ArrowRight } from 'lucide-react'
import { walletApi } from '@/api'
import { formatNaira, formatDate, formatTime } from '@/utils'
import { Card, Spinner, PageHeader, Button, BottomSheet, Input } from '@/components/ui'
import type { WalletResponse, WalletTransactionResponse, WalletTxType } from '@/types'

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

const TX_CONFIG: Record<WalletTxType, { label: string; isCredit: boolean }> = {
  credit_payment_received: { label: 'Payment received', isCredit: true },
  credit_loan_disbursement: { label: 'EkoCredit disbursement', isCredit: true },
  credit_wage_received: { label: 'Wage received', isCredit: true },
  debit_loan_repayment: { label: 'Loan repayment', isCredit: false },
  debit_ekosave_sweep: { label: 'EkoSave sweep', isCredit: false },
  debit_wage_payout: { label: 'Wage payout', isCredit: false },
  debit_withdrawal: { label: 'Withdrawal', isCredit: false },
  debit_insurance_premium: { label: 'Insurance premium', isCredit: false },
}

export default function SeekerEarningsPage() {
  const navigate = useNavigate()
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [txns, setTxns] = useState<WalletTransactionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [withdrawSheet, setWithdrawSheet] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({ amount_naira: '', bank_code: '000013', account_number: '', account_name: '' })
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)

  useEffect(() => {
    Promise.all([walletApi.getWallet(), walletApi.getTransactions(50)])
      .then(([w, t]) => { setWallet(w); setTxns(t) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleWithdraw = async () => {
    setWithdrawError('')
    const amount = parseInt(withdrawForm.amount_naira)
    if (!amount || amount < 1000) { setWithdrawError('Minimum withdrawal is ₦1,000'); return }
    if (withdrawForm.account_number.length !== 10) { setWithdrawError('Account number must be 10 digits'); return }
    if (!withdrawForm.account_name.trim()) { setWithdrawError('Enter account name'); return }
    setWithdrawing(true)
    try {
      await walletApi.withdraw({ amount_naira: amount, bank_code: withdrawForm.bank_code, account_number: withdrawForm.account_number, account_name: withdrawForm.account_name })
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

  const totalEarned = txns
    .filter(t => t.tx_type === 'credit_wage_received' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount_naira, 0)

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={32} />
    </div>
  )

  return (
    <div className="page-content stagger" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <PageHeader title="Earnings" subtitle="Your Eko wallet" back={() => navigate(-1)} />

      {/* Balance card */}
      <Card
        className="animate-fade-in-up"
        style={{ marginTop: 20, marginBottom: 12, background: 'var(--t0)', borderColor: 'transparent' }}
      >
        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Available Balance
          </p>
          <p style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', marginBottom: 20 }}>
            {wallet ? formatNaira(wallet.balance_naira) : '—'}
          </p>

          {/* Virtual account for receiving pay */}
          {wallet?.virtual_account_number && (
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Receive Payment To
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}>
                    {wallet.virtual_account_number}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    {wallet.virtual_bank_name} · {wallet.virtual_account_name}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (wallet?.virtual_account_number) {
                      await navigator.clipboard.writeText(wallet.virtual_account_number)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
                    padding: '8px 12px', color: copied ? 'var(--a)' : 'rgba(255,255,255,0.7)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Copy size={12} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>
                Traders send your wage directly here via Squad
              </p>
            </div>
          )}
          {/* Withdraw button */}
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setWithdrawSheet(true)}
              style={{ width: '100%', background: 'var(--a)', border: 'none', borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <ArrowRight size={16} />
              Withdraw to bank
            </button>
          </div>
        </div>
      </Card>

      {/* Total earned stat */}
      {totalEarned > 0 && (
        <Card className="animate-fade-in-up" style={{ marginBottom: 12 }}>
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--al)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} color="var(--a)" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 2 }}>Total earned on Eko</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--a)', letterSpacing: '-0.02em' }}>
                {formatNaira(totalEarned)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Transaction history */}
      <div className="animate-fade-in-up">
        <p className="section-title" style={{ marginBottom: 10 }}>Transaction History</p>

        {txns.length === 0 ? (
          <Card>
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 4 }}>No transactions yet</p>
              <p style={{ fontSize: 12, color: 'var(--t3)' }}>Complete a job to receive your first payment</p>
            </div>
          </Card>
        ) : (
          <Card>
            {txns.map((tx, idx) => {
              const cfg = TX_CONFIG[tx.tx_type] || { label: tx.tx_type, isCredit: tx.direction === 'credit' }
              const isCredit = tx.direction === 'credit'

              return (
                <div
                  key={tx.id}
                  style={{
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: idx < txns.length - 1 ? '1px solid var(--bd)' : 'none',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: isCredit ? 'var(--al)' : 'var(--s2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isCredit
                      ? <ArrowDownLeft size={16} color="var(--a)" />
                      : <ArrowUpRight size={16} color="var(--t2)" />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{cfg.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--t3)' }}>
                      {formatDate(tx.created_at)} · {formatTime(tx.created_at)}
                    </p>
                    {tx.description && (
                      <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>{tx.description}</p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: isCredit ? 'var(--a)' : 'var(--t0)' }}>
                      {isCredit ? '+' : '-'}{formatNaira(tx.amount_naira)}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--t3)' }}>{formatNaira(tx.balance_after_naira)}</p>
                  </div>
                </div>
              )
            })}
          </Card>
        )}
      </div>

      {/* Withdraw sheet */}
      <BottomSheet open={withdrawSheet} onClose={closeWithdraw} title="Withdraw Earnings">
        {withdrawSuccess ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--al)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ArrowRight size={28} color="var(--a)" />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Withdrawal initiated</p>
            <p style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.5 }}>
              {formatNaira(parseInt(withdrawForm.amount_naira))} is being transferred to your bank. Usually arrives within minutes.
            </p>
            <Button variant="amber" onClick={closeWithdraw} style={{ marginTop: 24 }}>Done</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--s1)', borderRadius: 'var(--r-sm)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, color: 'var(--t2)' }}>Available balance</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--a)' }}>{formatNaira(wallet?.balance_naira || 0)}</p>
            </div>
            <Input
              label="Amount (₦)"
              type="number"
              placeholder="e.g. 10000"
              value={withdrawForm.amount_naira}
              onChange={e => setWithdrawForm(f => ({ ...f, amount_naira: e.target.value }))}
              min={1000}
            />
            <div className="input-group">
              <label className="input-label">Bank</label>
              <select className="input" value={withdrawForm.bank_code} onChange={e => setWithdrawForm(f => ({ ...f, bank_code: e.target.value }))} style={{ appearance: 'auto' }}>
                {BANK_CODES.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
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
            <Button variant="amber" onClick={handleWithdraw} loading={withdrawing}>
              Withdraw {withdrawForm.amount_naira ? formatNaira(parseInt(withdrawForm.amount_naira)) : 'now'}
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
