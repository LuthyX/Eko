import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, ArrowDownLeft, ArrowUpRight, CreditCard } from 'lucide-react'
import { walletApi, creditApi } from '@/api'
import { formatNaira, formatDate, formatTime } from '@/utils'
import { Card, Badge, Button, Spinner, PageHeader, BottomSheet, Input } from '@/components/ui'
import type { WalletResponse, WalletTransactionResponse, WalletTxType, LoanResponse } from '@/types'

const TX_CONFIG: Record<WalletTxType, { label: string; icon: typeof ArrowDownLeft; color: string }> = {
  credit_payment_received: { label: 'Payment received', icon: ArrowDownLeft, color: 'var(--g)' },
  credit_loan_disbursement: { label: 'EkoCredit disbursement', icon: ArrowDownLeft, color: 'var(--g)' },
  credit_wage_received: { label: 'Wage received', icon: ArrowDownLeft, color: 'var(--g)' },
  debit_loan_repayment: { label: 'Loan repayment', icon: ArrowUpRight, color: 'var(--r)' },
  debit_ekosave_sweep: { label: 'EkoSave sweep', icon: ArrowUpRight, color: 'var(--a)' },
  debit_wage_payout: { label: 'Wage payout', icon: ArrowUpRight, color: 'var(--r)' },
  debit_withdrawal: { label: 'Withdrawal', icon: ArrowUpRight, color: 'var(--r)' },
  debit_insurance_premium: { label: 'Insurance premium', icon: ArrowUpRight, color: 'var(--r)' },
}

export default function WalletPage() {
  const navigate = useNavigate()
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [txns, setTxns] = useState<WalletTransactionResponse[]>([])
  const [activeLoan, setActiveLoan] = useState<LoanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([
      walletApi.getWallet(),
      walletApi.getTransactions(50),
      creditApi.getActiveLoan(),
    ]).then(([w, t, al]) => {
      setWallet(w)
      setTxns(t)
      setActiveLoan(al)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const copyVA = async () => {
    if (wallet?.virtual_account_number) {
      await navigator.clipboard.writeText(wallet.virtual_account_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={32} /></div>

  return (
    <div className="page-content stagger" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <PageHeader title="Wallet" back={() => navigate(-1)} />

      {/* Balance */}
      <Card className="animate-fade-in-up" style={{ marginTop: 20, marginBottom: 12, background: 'var(--t0)', borderColor: 'transparent' }}>
        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Total Balance</p>
          <p style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', marginBottom: 20 }}>
            {wallet ? formatNaira(wallet.balance_naira) : '—'}
          </p>
          {wallet?.virtual_account_number && (
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Virtual Account</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}>{wallet.virtual_account_number}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{wallet.virtual_bank_name} · {wallet.virtual_account_name}</p>
                </div>
                <button onClick={copyVA} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: '8px 12px', color: copied ? 'var(--g)' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Copy size={12} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>
                Send money to this account to top up your Eko wallet
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Active loan summary if any */}
      {activeLoan && (
        <Card className="animate-fade-in-up" style={{ marginBottom: 12, borderColor: 'var(--am)' }} onClick={() => navigate('/trader/credit')}>
          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Active Loan</p>
              <p style={{ fontSize: 12, color: 'var(--t2)' }}>Outstanding: {formatNaira(activeLoan.outstanding_naira)} · {activeLoan.sweep_rate_pct}% auto-sweep</p>
            </div>
            <Badge variant="amber">Repaying</Badge>
          </div>
        </Card>
      )}

      {/* Transactions */}
      <div className="animate-fade-in-up">
        <p className="section-title" style={{ marginBottom: 10 }}>Transactions</p>
        {txns.length === 0 ? (
          <Card>
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <CreditCard size={32} color="var(--t3)" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 14, color: 'var(--t2)' }}>No transactions yet</p>
              <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>Send money to your virtual account to get started</p>
            </div>
          </Card>
        ) : (
          <Card>
            <div>
              {txns.map((tx, idx) => {
                const cfg = TX_CONFIG[tx.tx_type] || { label: tx.tx_type, icon: ArrowDownLeft, color: 'var(--t2)' }
                const Icon = cfg.icon
                const isCredit = tx.direction === 'credit'
                return (
                  <div key={tx.id} style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderBottom: idx < txns.length - 1 ? '1px solid var(--bd)' : 'none',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: isCredit ? 'var(--gl)' : 'var(--rl)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={16} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{cfg.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--t3)' }}>{formatDate(tx.created_at)} · {formatTime(tx.created_at)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: isCredit ? 'var(--g)' : 'var(--t0)' }}>
                        {isCredit ? '+' : '-'}{formatNaira(tx.amount_naira)}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--t3)' }}>{formatNaira(tx.balance_after_naira)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
