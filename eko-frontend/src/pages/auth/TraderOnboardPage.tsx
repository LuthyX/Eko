import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Store, Tag } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api'
import { Button, Input } from '@/components/ui'

const CATEGORIES = [
  { value: 'fabric', label: 'Fabric & Textiles', emoji: '🧵' },
  { value: 'tech_retail', label: 'Tech & Electronics', emoji: '📱' },
  { value: 'perishables', label: 'Food & Perishables', emoji: '🥬' },
  { value: 'cosmetics', label: 'Beauty & Cosmetics', emoji: '💄' },
  { value: 'electronics', label: 'Electronics', emoji: '⚡' },
]

export default function TraderOnboardPage() {
  const { setTraderProfile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    business_name: '',
    business_category: '',
    market_location: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.business_category) { setError('Please select a business category'); return }
    setError('')
    setLoading(true)
    try {
      const profile = await authApi.onboardTrader(form)
      setTraderProfile(profile)
      navigate('/trader')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Onboarding failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ padding: '60px 24px 0' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: 'var(--gl)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Store size={24} color="var(--g)" />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
          Set up your shop
        </h1>
        <p style={{ color: 'var(--t2)', fontSize: 15, lineHeight: 1.5 }}>
          Tell us about your business so we can build your financial identity
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: '32px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Input
          label="Business name"
          placeholder="e.g. Amaka Fabrics"
          value={form.business_name}
          onChange={set('business_name')}
          leftIcon={<Store size={16} />}
          required
        />

        <div>
          <p className="input-label" style={{ marginBottom: 10 }}>Business category</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, business_category: cat.value }))}
                style={{
                  background: form.business_category === cat.value ? 'var(--gl)' : 'var(--s0)',
                  border: `1.5px solid ${form.business_category === cat.value ? 'var(--g)' : 'var(--bd)'}`,
                  borderRadius: 'var(--r-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t0)' }}>{cat.label}</span>
                {form.business_category === cat.value && (
                  <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: 'var(--g)' }} />
                )}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Market location"
          placeholder="e.g. Balogun Market, Lagos Island"
          value={form.market_location}
          onChange={set('market_location')}
          leftIcon={<MapPin size={16} />}
          required
        />

        {error && (
          <div style={{ background: 'var(--rl)', border: '1px solid #FCA5A5', borderRadius: 'var(--r-sm)', padding: '10px 14px' }}>
            <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
          </div>
        )}

        <Button type="submit" loading={loading} style={{ marginTop: 8 }}>
          Launch my profile
        </Button>
      </form>
    </div>
  )
}
