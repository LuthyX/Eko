import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Phone, ShoppingBag, Briefcase } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button, Input } from '@/components/ui'
import type { UserRole } from '@/types'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<UserRole>('trader')
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) { setStep(2); return }
    setError('')
    setLoading(true)
    try {
      await register({ ...form, role })
      navigate(role === 'job_seeker' ? '/seeker/onboard' : '/trader/onboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ padding: '60px 24px 0' }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em' }}>
            Ek<span style={{ color: 'var(--g)' }}>o</span>
          </span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
          {step === 1 ? 'Choose your role' : 'Create account'}
        </h1>
        <p style={{ color: 'var(--t2)', fontSize: 15 }}>
          {step === 1 ? 'How will you use Eko?' : 'Fill in your details to get started'}
        </p>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              height: 3, flex: 1, borderRadius: 999,
              background: s <= step ? 'var(--g)' : 'var(--s2)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: '32px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              {
                value: 'trader' as UserRole,
                icon: <ShoppingBag size={24} />,
                title: 'I\'m a Trader',
                desc: 'Sell goods, access working capital, hire workers',
                color: 'var(--g)',
                lightColor: 'var(--gl)',
              },
              {
                value: 'job_seeker' as UserRole,
                icon: <Briefcase size={24} />,
                title: 'I\'m a Job Seeker',
                desc: 'Find market work, get paid via Squad',
                color: 'var(--a)',
                lightColor: 'var(--al)',
              },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                style={{
                  background: role === opt.value ? opt.lightColor : 'var(--s0)',
                  border: `2px solid ${role === opt.value ? opt.color : 'var(--bd)'}`,
                  borderRadius: 'var(--r-lg)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s var(--ease)',
                  transform: role === opt.value ? 'scale(1.01)' : 'scale(1)',
                  boxShadow: role === opt.value ? `0 4px 16px ${opt.color}25` : 'none',
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: role === opt.value ? opt.color : 'var(--s1)',
                  color: role === opt.value ? '#fff' : 'var(--t2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.2s',
                }}>
                  {opt.icon}
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)', marginBottom: 4 }}>{opt.title}</p>
                  <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.4 }}>{opt.desc}</p>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${role === opt.value ? opt.color : 'var(--bd2)'}`,
                  background: role === opt.value ? opt.color : 'transparent',
                  marginLeft: 'auto', flexShrink: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {role === opt.value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
              </button>
            ))}
            <Button type="submit" style={{ marginTop: 8 }}>
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <>
            <Input label="Full name" type="text" placeholder="Amaka Okonkwo" value={form.full_name} onChange={set('full_name')} leftIcon={<User size={16} />} required />
            <Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} leftIcon={<Mail size={16} />} autoComplete="email" required />
            <Input label="Phone number" type="tel" placeholder="08011111111" value={form.phone} onChange={set('phone')} leftIcon={<Phone size={16} />} />
            <Input
              label="Password"
              type={showPw ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={set('password')}
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              minLength={8}
              required
            />

            {error && (
              <div style={{ background: 'var(--rl)', border: '1px solid #FCA5A5', borderRadius: 'var(--r-sm)', padding: '10px 14px' }}>
                <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Button type="button" variant="secondary" onClick={() => setStep(1)} fullWidth>
                Back
              </Button>
              <Button type="submit" loading={loading} variant={role === 'job_seeker' ? 'amber' : 'primary'}>
                Create account
              </Button>
            </div>
          </>
        )}

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--t2)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--g)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
