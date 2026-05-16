import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapPin, Clock, Zap, CheckCircle, DollarSign } from 'lucide-react'
import { matchApi } from '@/api'
import { formatNaira, getMatchScoreColor } from '@/utils'
import { Card, Badge, Button, Spinner, PageHeader } from '@/components/ui'
import type { OpportunityFeedItem, MatchResponse } from '@/types'

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<OpportunityFeedItem | null>(null)
  const [myMatch, setMyMatch] = useState<MatchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')

  const oppId = parseInt(id!)

  useEffect(() => {
    matchApi.getOpportunityForSeeker(oppId)
      .then(setJob)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [oppId])

  const handleApply = async () => {
    setError('')
    setApplying(true)
    try {
      const match = await matchApi.apply(oppId)
      setMyMatch(match)
      // Refresh with seeker-view endpoint
      const updated = await matchApi.getOpportunityForSeeker(oppId)
      setJob(updated)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Application failed')
    } finally {
      setApplying(false)
    }
  }

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={32} /></div>

  if (!job) return (
    <div className="page-content">
      <PageHeader title="Job Details" back={() => navigate(-1)} />
      <p style={{ padding: 20, color: 'var(--t2)' }}>Job not found</p>
    </div>
  )

  const matchScore = myMatch?.match_score ?? job.my_match_score
  const scoreColor = matchScore ? getMatchScoreColor(matchScore) : 'var(--a)'
  const alreadyApplied = job.already_applied || !!myMatch

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 120 }}>
      <div className="page-content stagger" style={{ paddingTop: 20 }}>
        <PageHeader title="Job Details" back={() => navigate(-1)} />

        {/* Main card */}
        <Card className="animate-fade-in-up" style={{ marginTop: 20, marginBottom: 12 }}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 22, marginBottom: 4 }}>{job.title}</h2>
                <p style={{ fontSize: 14, color: 'var(--t2)' }}>{job.trader_business_name}</p>
              </div>
              <Badge variant={job.status === 'open' ? 'green' : 'gray'}>
                {job.status}
              </Badge>
            </div>

            {/* Pay */}
            <div style={{ display: 'flex', gap: 16, padding: '16px 0', borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)', marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Daily Pay</p>
                <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--a)', letterSpacing: '-0.02em' }}>{formatNaira(job.daily_pay)}</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Duration</p>
                <p style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em' }}>{job.duration_days}d</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total</p>
                <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--g)', letterSpacing: '-0.02em' }}>{formatNaira(job.total_pay, true)}</p>
              </div>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin size={16} color="var(--t3)" />
                <p style={{ fontSize: 14, color: 'var(--t1)' }}>{job.location}</p>
              </div>
              {job.language_required && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🗣️</span>
                  <p style={{ fontSize: 14, color: 'var(--t1)', textTransform: 'capitalize' }}>{job.language_required} required</p>
                </div>
              )}
            </div>

            {/* Description */}
            {job.description && (
              <div style={{ marginTop: 16, padding: '14px', background: 'var(--s1)', borderRadius: 'var(--r-sm)' }}>
                <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.6 }}>{job.description}</p>
              </div>
            )}

            {/* Skills */}
            {job.skills_required && job.skills_required.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Skills needed</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {job.skills_required.map(s => (
                    <span key={s} style={{ fontSize: 12, background: 'var(--s2)', color: 'var(--t1)', padding: '5px 12px', borderRadius: 8, fontWeight: 500 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* AI match score — shows after applying */}
        {alreadyApplied && matchScore != null && (
          <Card className="animate-fade-in-up" style={{ marginBottom: 12, background: `${scoreColor}10`, borderColor: `${scoreColor}40` }}>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: `${scoreColor}20`, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <p style={{ fontSize: 18, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{matchScore.toFixed(0)}%</p>
                  <p style={{ fontSize: 9, color: scoreColor, fontWeight: 600 }}>FIT</p>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Zap size={12} color="var(--g)" />
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)' }}>Claude AI Match Score</p>
                  </div>
                  {(myMatch?.match_reasoning || '') && (
                    <p style={{ fontSize: 13, color: 'var(--t1)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{myMatch?.match_reasoning}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'var(--rl)', border: '1px solid #FCA5A5', borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
          </div>
        )}
      </div>

      {/* Sticky apply button */}
      <div style={{
        position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: 400,
      }}>
        {alreadyApplied ? (
          <div style={{
            background: 'var(--s0)', border: '1.5px solid var(--gm)', borderRadius: 'var(--r-md)',
            padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
            boxShadow: 'var(--shadow-md)',
          }}>
            <CheckCircle size={18} color="var(--g)" />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--g)' }}>Applied — waiting for trader</p>
          </div>
        ) : job.status === 'open' ? (
          <Button variant="amber" loading={applying} onClick={handleApply}
            style={{ boxShadow: '0 4px 24px rgba(245,166,35,0.3)' }}
          >
            Apply now — get AI matched
          </Button>
        ) : (
          <div style={{ background: 'var(--s2)', borderRadius: 'var(--r-md)', padding: '14px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--t2)' }}>This job is no longer accepting applications</p>
          </div>
        )}
      </div>
    </div>
  )
}
