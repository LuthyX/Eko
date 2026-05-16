import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, CheckCircle, Clock, XCircle, Phone, MapPin, Star, ChevronRight, DollarSign } from 'lucide-react'
import { matchApi } from '@/api'
import { formatNaira, formatRelative, getMatchScoreColor } from '@/utils'
import { Card, Badge, Spinner, EmptyState, PageHeader, BottomSheet, Button, Avatar } from '@/components/ui'
import type { MatchResponse, MatchStatus } from '@/types'

const STATUS_CONFIG: Record<MatchStatus, {
  label: string
  variant: 'green' | 'amber' | 'red' | 'gray' | 'blue'
  icon: typeof CheckCircle
  message: string
}> = {
  suggested: { label: 'Applied', variant: 'blue', icon: Clock, message: 'Waiting for trader to review' },
  accepted: { label: 'Got the job!', variant: 'green', icon: CheckCircle, message: "You've been selected 🎉" },
  rejected: { label: 'Not selected', variant: 'gray', icon: XCircle, message: 'Trader chose someone else' },
  completed: { label: 'Completed', variant: 'green', icon: CheckCircle, message: 'Job done · Payment sent' },
}

export default function SeekerApplicationsPage() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<MatchResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | MatchStatus>('all')

  // Contact sheet
  const [contactApp, setContactApp] = useState<MatchResponse | null>(null)

  // Rating sheet
  const [ratingApp, setRatingApp] = useState<MatchResponse | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [ratingDone, setRatingDone] = useState<Set<number>>(new Set())

  useEffect(() => {
    matchApi.getMyApplications()
      .then(setApplications)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleRate = async () => {
    if (!ratingApp || ratingValue === 0) return
    setSubmittingRating(true)
    try {
      await matchApi.rateMatch(ratingApp.id, ratingValue, ratingComment || undefined)
      setRatingDone(prev => new Set([...prev, ratingApp.id]))
      setRatingApp(null)
      setRatingValue(0)
      setRatingComment('')
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Rating failed')
    } finally {
      setSubmittingRating(false)
    }
  }

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter)

  const counts = {
    all: applications.length,
    suggested: applications.filter(a => a.status === 'suggested').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    completed: applications.filter(a => a.status === 'completed').length,
  }

  return (
    <div className="page-content stagger" style={{ paddingTop: 20 }}>
      <PageHeader title="My Applications" subtitle={`${counts.all} total`} />

      {/* Filter tabs */}
      <div className="animate-fade-in-up" style={{ display: 'flex', gap: 6, marginTop: 16, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {([
          { key: 'all', label: 'All' },
          { key: 'suggested', label: 'Pending' },
          { key: 'accepted', label: 'Active' },
          { key: 'completed', label: 'Done' },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '7px 14px', borderRadius: 999, flexShrink: 0,
              border: `1.5px solid ${filter === f.key ? 'var(--a)' : 'var(--bd2)'}`,
              background: filter === f.key ? 'var(--al)' : 'var(--s0)',
              color: filter === f.key ? 'var(--a2)' : 'var(--t2)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s',
            }}
          >
            {f.label}
            {f.key !== 'all' && counts[f.key] > 0 && (
              <span style={{ marginLeft: 6, background: filter === f.key ? 'var(--a)' : 'var(--s2)', color: filter === f.key ? '#fff' : 'var(--t2)', borderRadius: 999, padding: '1px 6px', fontSize: 11 }}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Clock size={24} />}
          title={filter === 'all' ? 'No applications yet' : `No ${filter} applications`}
          description={filter === 'all' ? 'Browse jobs and apply to get started' : undefined}
          action={filter === 'all' ? (
            <button onClick={() => navigate('/seeker')} style={{ background: 'var(--a)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              Browse jobs
            </button>
          ) : undefined}
        />
      ) : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(app => {
            const cfg = STATUS_CONFIG[app.status]
            const StatusIcon = cfg.icon
            const scoreColor = app.match_score ? getMatchScoreColor(app.match_score) : 'var(--t3)'
            const isAccepted = app.status === 'accepted'
            const isCompleted = app.status === 'completed'
            const alreadyRated = ratingDone.has(app.id)

            return (
              <Card
                key={app.id}
                className="animate-fade-in-up"
                style={{
                  borderColor: isAccepted ? 'var(--am)' : isCompleted ? 'var(--gm)' : undefined,
                  background: isAccepted
                    ? 'linear-gradient(135deg, var(--al) 0%, #fff 100%)'
                    : isCompleted
                    ? 'linear-gradient(135deg, var(--gl) 0%, #fff 100%)'
                    : undefined,
                }}
              >
                <div style={{ padding: '16px' }}>
                  {/* Title + status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, paddingRight: 12 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
                        {app.opportunity_title || `Job #${app.opportunity_id}`}
                      </p>
                      {app.trader_business_name && (
                        <p style={{ fontSize: 13, color: 'var(--t2)' }}>{app.trader_business_name}</p>
                      )}
                    </div>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>

                  {/* AI match score */}
                  {app.match_score != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: `${scoreColor}12`, border: `1px solid ${scoreColor}30`, borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
                      <Zap size={12} color="var(--g)" />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>
                          {app.match_score.toFixed(0)}% match
                          {app.engine_used === 'claude' && <span style={{ color: 'var(--t3)', fontWeight: 500, marginLeft: 4 }}>· Claude AI</span>}
                        </p>
                        {app.match_reasoning && (
                          <p style={{ fontSize: 11, color: 'var(--t1)', fontStyle: 'italic', marginTop: 1 }}>"{app.match_reasoning}"</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Accepted — show trader contact */}
                  {isAccepted && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                      <div style={{ background: 'var(--al)', borderRadius: 8, padding: '10px 12px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a2)', marginBottom: 4 }}>🎉 You got the job!</p>
                        <p style={{ fontSize: 12, color: 'var(--a2)', lineHeight: 1.5 }}>
                          Show up for work — you'll be paid once the trader marks it complete.
                        </p>
                      </div>
                      {/* Trader contact */}
                      {(app.trader_full_name || app.trader_phone) && (
                        <button
                          onClick={() => setContactApp(app)}
                          style={{ background: 'var(--s0)', border: '1px solid var(--bd)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: 'var(--font)' }}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Phone size={16} color="var(--t2)" />
                          </div>
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{app.trader_full_name || 'Trader'}</p>
                            <p style={{ fontSize: 12, color: 'var(--t2)' }}>{app.trader_phone ? 'Tap to call' : 'Contact trader'}</p>
                          </div>
                          <ChevronRight size={14} color="var(--t3)" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Completed — earnings + rating */}
                  {isCompleted && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                      {app.paid_at && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gl)', borderRadius: 8, padding: '8px 12px' }}>
                          <DollarSign size={14} color="var(--g)" />
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--g2)' }}>
                            Payment received · {formatRelative(app.paid_at)}
                          </p>
                        </div>
                      )}
                      {!alreadyRated ? (
                        <button
                          onClick={() => setRatingApp(app)}
                          style={{ background: 'var(--al)', border: '1px solid var(--am)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--a2)', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}
                        >
                          <Star size={14} />
                          Rate this trader
                        </button>
                      ) : (
                        <p style={{ fontSize: 12, color: 'var(--t3)' }}>✓ Rated</p>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 11, color: 'var(--t3)' }}>Applied {formatRelative(app.created_at)}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StatusIcon size={12} color={`var(--${cfg.variant === 'gray' ? 't3' : cfg.variant === 'blue' ? 'b' : cfg.variant})`} />
                      <p style={{ fontSize: 11, color: 'var(--t2)' }}>{cfg.message}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Trader contact sheet */}
      <BottomSheet open={!!contactApp} onClose={() => setContactApp(null)} title="Trader Contact">
        {contactApp && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={contactApp.trader_full_name || 'T'} size={56} green />
              <div>
                <p style={{ fontSize: 18, fontWeight: 700 }}>{contactApp.trader_full_name || 'Trader'}</p>
                {contactApp.trader_business_name && (
                  <p style={{ fontSize: 13, color: 'var(--t2)' }}>{contactApp.trader_business_name}</p>
                )}
              </div>
            </div>

            {contactApp.trader_phone ? (
              <a
                href={`tel:${contactApp.trader_phone}`}
                style={{ background: 'var(--g)', color: '#fff', borderRadius: 'var(--r-md)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: 'var(--shadow-green)' }}
              >
                <Phone size={18} />
                {contactApp.trader_phone}
              </a>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--t2)', textAlign: 'center' }}>No phone number on file</p>
            )}

            <div style={{ background: 'var(--s1)', borderRadius: 'var(--r-sm)', padding: '12px 14px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', marginBottom: 4 }}>
                {contactApp.opportunity_title}
              </p>
              <p style={{ fontSize: 12, color: 'var(--t2)' }}>
                Call or WhatsApp to confirm work schedule and location
              </p>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Rating sheet */}
      <BottomSheet open={!!ratingApp} onClose={() => { setRatingApp(null); setRatingValue(0); setRatingComment('') }} title="Rate this trader">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--t2)' }}>How was your experience working with this trader?</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRatingValue(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <Star size={36} color={n <= ratingValue ? 'var(--a)' : 'var(--s2)'} fill={n <= ratingValue ? 'var(--a)' : 'var(--s2)'} />
              </button>
            ))}
          </div>
          {ratingValue > 0 && (
            <p style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--a)' }}>
              {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][ratingValue]}
            </p>
          )}
          <div className="input-group">
            <label className="input-label">Comment (optional)</label>
            <textarea className="input" placeholder="e.g. Fair pay, easy to work with..." value={ratingComment} onChange={e => setRatingComment(e.target.value)} rows={3} />
          </div>
          <Button onClick={handleRate} loading={submittingRating} disabled={ratingValue === 0} variant="amber">
            Submit rating
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
