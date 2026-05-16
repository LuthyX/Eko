import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api'
import { Button, Input } from '@/components/ui'

const SKILL_OPTIONS = ['selling', 'carrying', 'customer service', 'cashier', 'inventory', 'shop keeping', 'loading', 'delivery', 'cleaning', 'cooking']
const LANG_OPTIONS = ['yoruba', 'igbo', 'hausa', 'english', 'pidgin']

export default function SeekerOnboardPage() {
  const { setSeekerProfile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    skills: [] as string[],
    languages: [] as string[],
    location: '',
    daily_rate_expectation: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleSkill = (s: string) =>
    setForm(f => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter(x => x !== s) : [...f.skills, s] }))

  const toggleLang = (l: string) =>
    setForm(f => ({ ...f, languages: f.languages.includes(l) ? f.languages.filter(x => x !== l) : [...f.languages, l] }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.skills.length === 0) { setError('Select at least one skill'); return }
    if (form.languages.length === 0) { setError('Select at least one language'); return }
    setError('')
    setLoading(true)
    try {
      const profile = await authApi.onboardJobSeeker({
        skills: form.skills,
        languages: form.languages,
        location: form.location,
        daily_rate_expectation: form.daily_rate_expectation ? parseInt(form.daily_rate_expectation) : undefined,
      })
      setSeekerProfile(profile)
      navigate('/seeker')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Onboarding failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', paddingBottom: 32 }}>
      <div style={{ padding: '60px 24px 0' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: 'var(--al)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 24 }}>💼</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
          Build your profile
        </h1>
        <p style={{ color: 'var(--t2)', fontSize: 15, lineHeight: 1.5 }}>
          Tell us your skills so Eko can match you to the right opportunities
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: '32px 24px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <p className="input-label" style={{ marginBottom: 10 }}>Your skills</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SKILL_OPTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSkill(s)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1.5px solid ${form.skills.includes(s) ? 'var(--a)' : 'var(--bd2)'}`,
                  background: form.skills.includes(s) ? 'var(--al)' : 'var(--s0)',
                  color: form.skills.includes(s) ? 'var(--a2)' : 'var(--t1)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'var(--font)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="input-label" style={{ marginBottom: 10 }}>Languages you speak</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {LANG_OPTIONS.map(l => (
              <button
                key={l}
                type="button"
                onClick={() => toggleLang(l)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1.5px solid ${form.languages.includes(l) ? 'var(--a)' : 'var(--bd2)'}`,
                  background: form.languages.includes(l) ? 'var(--al)' : 'var(--s0)',
                  color: form.languages.includes(l) ? 'var(--a2)' : 'var(--t1)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'var(--font)',
                  textTransform: 'capitalize',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Your location"
          placeholder="e.g. Surulere, Lagos"
          value={form.location}
          onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
          leftIcon={<MapPin size={16} />}
          required
        />

        <Input
          label="Daily rate expectation (₦)"
          type="number"
          placeholder="e.g. 4000"
          value={form.daily_rate_expectation}
          onChange={e => setForm(f => ({ ...f, daily_rate_expectation: e.target.value }))}
        />

        {error && (
          <div style={{ background: 'var(--rl)', border: '1px solid #FCA5A5', borderRadius: 'var(--r-sm)', padding: '10px 14px' }}>
            <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
          </div>
        )}

        <Button type="submit" loading={loading} variant="amber">
          Find me work
        </Button>
      </form>
    </div>
  )
}
