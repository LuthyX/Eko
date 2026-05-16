import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Clock, Zap, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { matchApi, walletApi } from '@/api'
import { formatNaira, formatRelative, getMatchScoreColor } from '@/utils'
import { Card, Badge, Spinner, Avatar } from '@/components/ui'
import type { OpportunityFeedItem, WalletResponse } from '@/types'

export default function SeekerHome() {
  const { user, seekerProfile } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<OpportunityFeedItem[]>([])
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      matchApi.browseOpportunities(),
      walletApi.getWallet(),
    ]).then(([j, w]) => {
      setJobs(j)
      setWallet(w)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const filtered = jobs.filter(j =>
    !search || j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.location.toLowerCase().includes(search.toLowerCase()) ||
    j.skills_required?.some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="page-content stagger" style={{ paddingTop: 20 }}>
      {/* Header */}
      <div className="animate-fade-in-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={user?.full_name || 'S'} size={44} />
          <div>
            <p style={{ fontSize: 13, color: 'var(--t2)' }}>{greeting()}</p>
            <h2 style={{ fontSize: 20, letterSpacing: '-0.02em' }}>{user?.full_name?.split(' ')[0]}</h2>
          </div>
        </div>
        {/* Earnings badge */}
        <div
          onClick={() => navigate('/seeker/earnings')}
          style={{ background: 'var(--al)', borderRadius: 12, padding: '8px 12px', cursor: 'pointer', textAlign: 'right' }}
        >
          <p style={{ fontSize: 11, color: 'var(--a2)', fontWeight: 600 }}>Wallet</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--a)', letterSpacing: '-0.02em' }}>
            {wallet ? formatNaira(wallet.balance_naira, true) : '—'}
          </p>
        </div>
      </div>

      {/* Profile quick summary */}
      {seekerProfile && (
        <Card
          className="animate-fade-in-up"
          style={{ marginBottom: 16, background: 'linear-gradient(135deg, #1a1a18 0%, #2d2d28 100%)', borderColor: 'transparent', cursor: 'pointer' }}
          onClick={() => navigate('/seeker/profile')}
        >
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Profile</p>
              <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                  {seekerProfile.skills?.length || 0}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>skills</p>
              </div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--a)', letterSpacing: '-0.02em' }}>
                  {seekerProfile.daily_rate_expectation ? `₦${seekerProfile.daily_rate_expectation.toLocaleString()}` : '—'}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>daily rate</p>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                  {seekerProfile.languages?.slice(0, 2).map(l => (
                    <span key={l} style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{l}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="animate-fade-in-up" style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} color="var(--t3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          className="input"
          style={{ paddingLeft: 40 }}
          placeholder="Search jobs, skills, location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Jobs feed */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p className="section-title">Available Jobs</p>
          <p style={{ fontSize: 12, color: 'var(--t3)' }}>{filtered.length} open</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--t2)' }}>No jobs match your search</p>
          </div>
        ) : (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(job => (
              <JobCard key={job.id} job={job} onPress={() => navigate(`/seeker/jobs/${job.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function JobCard({ job, onPress }: { job: OpportunityFeedItem; onPress: () => void }) {
  const scoreColor = job.my_match_score ? getMatchScoreColor(job.my_match_score) : undefined

  return (
    <Card className="animate-fade-in-up" onClick={onPress} style={{ cursor: 'pointer' }}>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2, lineHeight: 1.3 }}>{job.title}</p>
            <p style={{ fontSize: 13, color: 'var(--t2)' }}>{job.trader_business_name || 'Trader'}</p>
          </div>
          {/* Match score */}
          {job.my_match_score != null ? (
            <div style={{ background: scoreColor + '18', border: `1.5px solid ${scoreColor}40`, borderRadius: 10, padding: '4px 10px', textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontSize: 16, fontWeight: 900, color: scoreColor, letterSpacing: '-0.02em', lineHeight: 1 }}>{job.my_match_score.toFixed(0)}%</p>
              <p style={{ fontSize: 9, color: scoreColor, fontWeight: 600, opacity: 0.7 }}>MATCH</p>
            </div>
          ) : (
            <div style={{ background: 'var(--s1)', borderRadius: 10, padding: '6px 10px', textAlign: 'center', flexShrink: 0 }}>
              <Zap size={16} color="var(--t3)" />
              <p style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 600, marginTop: 2 }}>AI SCORE</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} color="var(--t3)" />
            <p style={{ fontSize: 12, color: 'var(--t2)' }}>{job.location.split(',')[0]}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} color="var(--t3)" />
            <p style={{ fontSize: 12, color: 'var(--t2)' }}>{job.duration_days}d</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {job.skills_required?.slice(0, 2).map(s => (
              <span key={s} style={{ fontSize: 11, background: 'var(--s1)', color: 'var(--t2)', padding: '3px 8px', borderRadius: 6 }}>{s}</span>
            ))}
            {job.language_required && (
              <span style={{ fontSize: 11, background: 'var(--al)', color: 'var(--a2)', padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{job.language_required}</span>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--a)', letterSpacing: '-0.02em' }}>{formatNaira(job.daily_pay)}</p>
            <p style={{ fontSize: 11, color: 'var(--t3)' }}>per day</p>
          </div>
        </div>

        {job.already_applied && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--g)' }} />
            <p style={{ fontSize: 12, color: 'var(--g)', fontWeight: 600 }}>Applied</p>
          </div>
        )}
      </div>
    </Card>
  )
}
