import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Info, TrendingUp } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { scoreApi } from '@/api'
import { formatDate, getScoreColor, getRiskTierColor } from '@/utils'
import { Card, Badge, Spinner, ProgressBar, PageHeader } from '@/components/ui'
import ScoreRing from '@/components/shared/ScoreRing'
import type { EkoScoreResponse, EkoScoreHistoryItem } from '@/types'

const SIGNAL_DESCRIPTIONS: Record<string, string> = {
  transaction_volume: 'Total Squad receipts over 90 days',
  tenure_recency: 'How long & how recently you\'ve been active',
  cohort_comparison: 'Your performance vs peers in your category',
  behavioural_stability: 'Consistency of your transaction patterns',
  identity_tier: 'BVN/NIN verification level',
}

export default function ScorePage() {
  const { traderProfile } = useAuth()
  const navigate = useNavigate()
  const [score, setScore] = useState<EkoScoreResponse | null>(null)
  const [history, setHistory] = useState<EkoScoreHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!traderProfile) return
    Promise.all([
      scoreApi.getScore(traderProfile.id),
      scoreApi.getHistory(traderProfile.id),
    ]).then(([s, h]) => {
      setScore(s)
      setHistory(h.reverse()) // chart wants oldest first
    }).catch(console.error).finally(() => setLoading(false))
  }, [traderProfile])

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}><Spinner size={32} /></div>

  if (!score) return (
    <div className="page-content">
      <PageHeader title="EkoScore" back={() => navigate(-1)} />
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--t2)' }}>No score yet. Keep transacting via Squad.</p>
      </div>
    </div>
  )

  const chartData = history.map(h => ({
    date: new Date(h.computed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
    score: h.score,
  }))

  return (
    <div className="page-content stagger" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <PageHeader title="EkoScore" subtitle="Your financial identity" back={() => navigate(-1)} />

      {/* Big score card */}
      <Card className="animate-fade-in-up" style={{ marginTop: 20, marginBottom: 12 }}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <ScoreRing score={score.score} size={120} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <Badge variant={score.risk_tier === 'A' ? 'green' : score.risk_tier === 'B' ? 'amber' : 'red'}>
              Risk Tier {score.risk_tier}
            </Badge>
            {score.is_cold_start && <Badge variant="gray">Cold Start</Badge>}
            {score.credit_eligible && <Badge variant="green">Credit Eligible</Badge>}
          </div>
          <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>
            {score.credit_eligible
              ? `You qualify for up to ₦${(score.max_advance_ngn || 0).toLocaleString()} working capital`
              : score.is_cold_start
              ? 'Building your profile — keep transacting to unlock credit'
              : `Need ${(60 - score.score).toFixed(0)} more points for EkoCredit`}
          </p>
          {!score.credit_eligible && !score.is_cold_start && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>Current</span>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>Target: 60</span>
              </div>
              <ProgressBar value={score.score} max={100} color="var(--a)" />
            </div>
          )}
        </div>
      </Card>

      {/* Score history chart */}
      {chartData.length > 1 && (
        <Card className="animate-fade-in-up" style={{ marginBottom: 12 }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <TrendingUp size={16} color="var(--g)" />
              <p style={{ fontSize: 14, fontWeight: 700 }}>Score History</p>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--t3)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--t3)' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{ background: 'var(--t0)', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' }}
                  itemStyle={{ color: 'var(--g)' }}
                />
                <Line
                  type="monotone" dataKey="score"
                  stroke="var(--g)" strokeWidth={2.5}
                  dot={{ fill: 'var(--g)', r: 3 }}
                  activeDot={{ r: 5, fill: 'var(--g)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* SHAP breakdown */}
      {score.shap_values && (
        <Card className="animate-fade-in-up" style={{ marginBottom: 12 }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Info size={16} color="var(--t2)" />
              <p style={{ fontSize: 14, fontWeight: 700 }}>Score Breakdown</p>
              <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>SHAP-explained</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(score.shap_values).map(([key, signal]) => {
                const rawScore = (score as any)[`${key}_score`] as number | null
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{signal.label}</p>
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
          </div>
        </Card>
      )}

      {/* Last computed */}
      <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginBottom: 24 }}>
        Last computed {formatDate(score.computed_at)}
      </p>
    </div>
  )
}
