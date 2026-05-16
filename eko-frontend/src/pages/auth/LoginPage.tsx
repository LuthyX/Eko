import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button, Input } from '@/components/ui'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      // redirect based on role stored in localStorage
      const role = localStorage.getItem('eko_role')
      navigate(role === 'job_seeker' ? '/seeker' : '/trader')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '60px 24px 0' }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--t0)' }}>
            Ek<span style={{ color: 'var(--g)' }}>o</span>
          </span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
          Welcome back
        </h1>
        <p style={{ color: 'var(--t2)', fontSize: 15, lineHeight: 1.5 }}>
          Sign in to your account to continue
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ flex: 1, padding: '32px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          leftIcon={<Mail size={16} />}
          autoComplete="email"
          required
        />
        <Input
          label="Password"
          type={showPw ? 'text' : 'password'}
          placeholder="Enter your password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: 0 }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          autoComplete="current-password"
          required
        />

        {error && (
          <div style={{ background: 'var(--rl)', border: '1px solid #FCA5A5', borderRadius: 'var(--r-sm)', padding: '10px 14px' }}>
            <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          <Button type="submit" loading={loading}>
            Sign in
          </Button>
        </div>

        {/* Demo accounts shortcut */}
        <div style={{ background: 'var(--s1)', borderRadius: 'var(--r-md)', padding: '14px 16px', border: '1px solid var(--bd)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Demo accounts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Amaka (trader)', email: 'amaka@eko.demo' },
              { label: 'Emeka (job seeker)', email: 'emeka@eko.demo' },
            ].map(d => (
              <button
                key={d.email}
                type="button"
                onClick={() => { setEmail(d.email); setPassword('demo1234') }}
                style={{
                  background: 'var(--s0)', border: '1px solid var(--bd)',
                  borderRadius: 8, padding: '8px 12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>{d.label}</span>
                <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{d.email}</span>
              </button>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--t2)', marginTop: 4 }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--g)', fontWeight: 600, textDecoration: 'none' }}>
            Sign up
          </Link>
        </p>
      </form>
    </div>
  )
}
