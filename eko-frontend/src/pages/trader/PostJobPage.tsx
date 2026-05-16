import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, DollarSign, Clock } from 'lucide-react'
import { matchApi } from '@/api'
import { formatNaira } from '@/utils'
import { Button, Input, PageHeader } from '@/components/ui'

const SKILL_OPTIONS = ['selling', 'carrying', 'customer service', 'cashier', 'inventory', 'shop keeping', 'loading', 'delivery', 'cleaning']
const LANG_OPTIONS = ['yoruba', 'igbo', 'hausa', 'english', 'pidgin']

export default function PostJobPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    description: '',
    daily_pay: '',
    duration_days: '',
    location: '',
    language_required: '',
    skills_required: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const toggleSkill = (s: string) =>
    setForm(f => ({ ...f, skills_required: f.skills_required.includes(s) ? f.skills_required.filter(x => x !== s) : [...f.skills_required, s] }))

  const totalPay = form.daily_pay && form.duration_days
    ? parseInt(form.daily_pay) * parseInt(form.duration_days)
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const job = await matchApi.postOpportunity({
        title: form.title,
        description: form.description || undefined,
        daily_pay: parseInt(form.daily_pay),
        duration_days: parseInt(form.duration_days),
        location: form.location,
        language_required: form.language_required || undefined,
        skills_required: form.skills_required.length > 0 ? form.skills_required : undefined,
      })
      navigate(`/trader/jobs/${job.id}/applicants`)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to post job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 40 }}>
      <div className="page-content" style={{ paddingTop: 20 }}>
        <PageHeader title="Post a Job" subtitle="Find workers nearby" back={() => navigate(-1)} />

        <form onSubmit={handleSubmit} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Input label="Job title" placeholder="e.g. Market sales assistant" value={form.title} onChange={set('title')} required />

          <div className="input-group">
            <label className="input-label">Description (optional)</label>
            <textarea
              className="input"
              placeholder="What will this person be doing?"
              value={form.description}
              onChange={set('description')}
              rows={3}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Daily pay (₦)"
              type="number"
              placeholder="4000"
              value={form.daily_pay}
              onChange={set('daily_pay')}
              leftIcon={<DollarSign size={16} />}
              min={500}
              required
            />
            <Input
              label="Duration (days)"
              type="number"
              placeholder="3"
              value={form.duration_days}
              onChange={set('duration_days')}
              leftIcon={<Clock size={16} />}
              min={1}
              max={90}
              required
            />
          </div>

          {/* Total pay preview */}
          {totalPay > 0 && (
            <div style={{ background: 'var(--gl)', borderRadius: 'var(--r-md)', padding: '12px 16px', border: '1px solid var(--gm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--g2)', fontWeight: 500 }}>Total worker pay</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--g)', letterSpacing: '-0.02em' }}>{formatNaira(totalPay)}</p>
            </div>
          )}

          <Input
            label="Location"
            placeholder="e.g. Balogun Market, Lagos Island"
            value={form.location}
            onChange={set('location')}
            leftIcon={<MapPin size={16} />}
            required
          />

          <div>
            <p className="input-label" style={{ marginBottom: 10 }}>Language required (optional)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['', ...LANG_OPTIONS].map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, language_required: l }))}
                  style={{
                    padding: '7px 14px', borderRadius: 999,
                    border: `1.5px solid ${form.language_required === l ? 'var(--g)' : 'var(--bd2)'}`,
                    background: form.language_required === l ? 'var(--gl)' : 'var(--s0)',
                    color: form.language_required === l ? 'var(--g2)' : 'var(--t2)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
                    transition: 'all 0.15s',
                    textTransform: 'capitalize',
                  }}
                >
                  {l || 'Any'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="input-label" style={{ marginBottom: 10 }}>Skills needed (optional)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SKILL_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSkill(s)}
                  style={{
                    padding: '7px 14px', borderRadius: 999,
                    border: `1.5px solid ${form.skills_required.includes(s) ? 'var(--g)' : 'var(--bd2)'}`,
                    background: form.skills_required.includes(s) ? 'var(--gl)' : 'var(--s0)',
                    color: form.skills_required.includes(s) ? 'var(--g2)' : 'var(--t2)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
                    transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Platform fee info */}
          {totalPay > 0 && (
            <div style={{ background: 'var(--s1)', borderRadius: 'var(--r-md)', padding: '12px 16px', border: '1px solid var(--bd)' }}>
              <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>
                <strong>Platform fee:</strong> {formatNaira(Math.round(totalPay * 0.05))} (5%) will be charged when you mark the job complete. Total from your wallet: {formatNaira(Math.round(totalPay * 1.05))}.
              </p>
            </div>
          )}

          {error && (
            <p style={{ fontSize: 13, color: 'var(--r)', background: 'var(--rl)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>{error}</p>
          )}

          <Button type="submit" loading={loading}>
            Post job — find workers
          </Button>
        </form>
      </div>
    </div>
  )
}
