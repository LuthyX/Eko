import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MapPin, Clock, Users, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { matchApi } from '@/api'
import { formatNaira, formatRelative } from '@/utils'
import { Card, Badge, Button, Spinner, EmptyState, PageHeader } from '@/components/ui'
import type { OpportunityResponse } from '@/types'

export default function TraderJobsPage() {
  const { traderProfile } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<OpportunityResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'active' | 'completed'>('all')

  useEffect(() => {
    matchApi.getMyOpportunities()
      .then(setJobs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? jobs : jobs.filter(j => {
    if (filter === 'active') return j.status === 'in_progress'
    return j.status === filter
  })

  const statusConfig = {
    open: { variant: 'green' as const, label: 'Open' },
    matched: { variant: 'blue' as const, label: 'Matched' },
    in_progress: { variant: 'amber' as const, label: 'Active' },
    completed: { variant: 'gray' as const, label: 'Done' },
    cancelled: { variant: 'red' as const, label: 'Cancelled' },
  }

  return (
    <div className="page-content stagger" style={{ paddingTop: 20 }}>
      <PageHeader
        title="My Jobs"
        subtitle={`${jobs.filter(j => j.status === 'open').length} open`}
        right={
          <button
            onClick={() => navigate('/trader/jobs/new')}
            style={{
              background: 'var(--g)', border: 'none', borderRadius: 12,
              padding: '10px 14px', color: '#fff', display: 'flex',
              alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
            }}
          >
            <Plus size={16} />
            Post job
          </button>
        }
      />

      {/* Filter tabs */}
      <div className="animate-fade-in-up" style={{ display: 'flex', gap: 6, marginTop: 16, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {(['all', 'open', 'active', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 16px', borderRadius: 999, flexShrink: 0,
              border: `1.5px solid ${filter === f ? 'var(--g)' : 'var(--bd2)'}`,
              background: filter === f ? 'var(--gl)' : 'var(--s0)',
              color: filter === f ? 'var(--g2)' : 'var(--t2)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              transition: 'all 0.15s',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title="No jobs here"
          description="Post a job to find nearby workers"
          action={<Button onClick={() => navigate('/trader/jobs/new')}>Post your first job</Button>}
        />
      ) : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(job => {
            const cfg = statusConfig[job.status]
            return (
              <Card
                key={job.id}
                className="animate-fade-in-up"
                onClick={() => navigate(job.status === 'open' || job.status === 'in_progress'
                  ? `/trader/jobs/${job.id}/applicants`
                  : `/trader/jobs/${job.id}`)}
              >
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, paddingRight: 12 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{job.title}</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--g)', letterSpacing: '-0.02em' }}>
                        {formatNaira(job.daily_pay)}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--t2)' }}>/day</span>
                      </p>
                    </div>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>

                  <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} color="var(--t3)" />
                      <p style={{ fontSize: 12, color: 'var(--t2)' }}>{job.location.split(',')[0]}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} color="var(--t3)" />
                      <p style={{ fontSize: 12, color: 'var(--t2)' }}>{job.duration_days}d · {formatNaira(job.total_pay)} total</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {job.skills_required?.slice(0, 2).map(s => (
                        <span key={s} style={{ fontSize: 11, background: 'var(--s1)', color: 'var(--t2)', padding: '3px 8px', borderRadius: 6 }}>{s}</span>
                      ))}
                      {job.language_required && (
                        <span style={{ fontSize: 11, background: 'var(--bl)', color: 'var(--b)', padding: '3px 8px', borderRadius: 6 }}>{job.language_required}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {job.applicant_count > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--g)', fontWeight: 700 }}>
                          {job.applicant_count} {job.applicant_count === 1 ? 'applicant' : 'applicants'}
                        </span>
                      )}
                      <ChevronRight size={14} color="var(--t3)" />
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
