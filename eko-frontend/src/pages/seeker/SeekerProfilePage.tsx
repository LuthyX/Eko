import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Star, CheckCircle, Edit2, Save, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api'
import { formatNaira } from '@/utils'
import { Card, Badge, Button, Spinner, PageHeader, Avatar, Input } from '@/components/ui'

const SKILL_OPTIONS = ['selling', 'carrying', 'customer service', 'cashier', 'inventory', 'shop keeping', 'loading', 'delivery', 'cleaning', 'cooking']
const LANG_OPTIONS = ['yoruba', 'igbo', 'hausa', 'english', 'pidgin']

export default function SeekerProfilePage() {
  const { user, seekerProfile, setSeekerProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    skills: seekerProfile?.skills || [],
    languages: seekerProfile?.languages || [],
    location: seekerProfile?.location || '',
    daily_rate_expectation: seekerProfile?.daily_rate_expectation?.toString() || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState(false)

  // If seekerProfile not in context yet, fetch it directly
  useEffect(() => {
    if (!seekerProfile) {
      authApi.getJobSeekerProfile()
        .then(p => setSeekerProfile(p))
        .catch(() => setLoadError(true))
    }
  }, [])

  // Sync form when profile loads
  useEffect(() => {
    if (seekerProfile) {
      setForm({
        skills: seekerProfile.skills || [],
        languages: seekerProfile.languages || [],
        location: seekerProfile.location || '',
        daily_rate_expectation: seekerProfile.daily_rate_expectation?.toString() || '',
      })
    }
  }, [seekerProfile])

  const toggleSkill = (s: string) =>
    setForm(f => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter(x => x !== s) : [...f.skills, s] }))

  const toggleLang = (l: string) =>
    setForm(f => ({ ...f, languages: f.languages.includes(l) ? f.languages.filter(x => x !== l) : [...f.languages, l] }))

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      const updated = await authApi.updateJobSeekerProfile({
        skills: form.skills,
        languages: form.languages,
        location: form.location,
        daily_rate_expectation: form.daily_rate_expectation ? parseInt(form.daily_rate_expectation) : undefined,
      })
      setSeekerProfile(updated)
      setEditing(false)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) return (
    <div className="page-content" style={{ paddingTop: 20 }}>
      <PageHeader title="My Profile" back={() => navigate(-1)} />
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>
          Profile not found
        </p>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 24, lineHeight: 1.5 }}>
          Your profile couldn't be loaded. You may need to complete onboarding first.
        </p>
        <button
          onClick={() => navigate('/seeker/onboard')}
          style={{
            background: 'var(--a)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '12px 24px', fontSize: 14,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
          }}
        >
          Complete profile
        </button>
      </div>
    </div>
  )

  if (!seekerProfile) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={32} />
    </div>
  )

  const reliabilityLabel = (() => {
    // Derived from job history — we don't have this in seekerProfile from auth endpoint
    // So we show a simple tier based on available data
    return 'Active'
  })()

  return (
    <div className="page-content stagger" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <PageHeader
        title="My Profile"
        back={() => navigate(-1)}
        right={
          !editing ? (
            <button
              onClick={() => setEditing(true)}
              style={{
                background: 'var(--al)', border: 'none', borderRadius: 10,
                padding: '8px 14px', color: 'var(--a)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Edit2 size={14} />
              Edit
            </button>
          ) : undefined
        }
      />

      {/* Profile hero */}
      <Card className="animate-fade-in-up" style={{ marginTop: 20, marginBottom: 12 }}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Avatar name={user?.full_name || 'S'} size={72} />
          </div>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>{user?.full_name}</h2>
          {seekerProfile.location && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 12 }}>
              <MapPin size={14} color="var(--t3)" />
              <p style={{ fontSize: 14, color: 'var(--t2)' }}>{seekerProfile.location}</p>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <Badge variant="amber">{reliabilityLabel}</Badge>
            {user?.identity_tier !== 'none' && (
              <Badge variant="green">
                <CheckCircle size={10} /> Verified
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="animate-fade-in-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: 'var(--s0)', borderRadius: 'var(--r-md)', padding: '16px', border: '1px solid var(--bd)', textAlign: 'center' }}>
          <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--a)', letterSpacing: '-0.03em' }}>
            {seekerProfile.daily_rate_expectation ? formatNaira(seekerProfile.daily_rate_expectation, true) : '—'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>daily rate</p>
        </div>
        <div style={{ background: 'var(--s0)', borderRadius: 'var(--r-md)', padding: '16px', border: '1px solid var(--bd)', textAlign: 'center' }}>
          <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em' }}>
            {seekerProfile.skills?.length || 0}
          </p>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>skills</p>
        </div>
      </div>

      {!editing ? (
        /* View mode */
        <>
          {/* Skills */}
          <Card className="animate-fade-in-up" style={{ marginBottom: 12 }}>
            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 12 }}>Skills</p>
              {seekerProfile.skills && seekerProfile.skills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {seekerProfile.skills.map(s => (
                    <span
                      key={s}
                      style={{
                        padding: '6px 14px', borderRadius: 999,
                        background: 'var(--al)', color: 'var(--a2)',
                        fontSize: 13, fontWeight: 500, border: '1px solid var(--am)',
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--t3)' }}>No skills added yet</p>
              )}
            </div>
          </Card>

          {/* Languages */}
          <Card className="animate-fade-in-up" style={{ marginBottom: 12 }}>
            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 12 }}>Languages</p>
              {seekerProfile.languages && seekerProfile.languages.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {seekerProfile.languages.map(l => (
                    <span
                      key={l}
                      style={{
                        padding: '6px 14px', borderRadius: 999,
                        background: 'var(--bl)', color: 'var(--b)',
                        fontSize: 13, fontWeight: 500, border: '1px solid var(--bm)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--t3)' }}>No languages added yet</p>
              )}
            </div>
          </Card>

          {/* How Eko matching works */}
          <Card className="animate-fade-in-up" style={{ marginBottom: 12, background: 'var(--gl)', borderColor: 'var(--gm)' }}>
            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--g2)', marginBottom: 8 }}>How Eko matches you</p>
              <p style={{ fontSize: 13, color: 'var(--g3)', lineHeight: 1.6 }}>
                Claude AI reads your skills, languages, location, and rate to score your fit for each job.
                Complete jobs and earn good ratings to unlock better opportunities.
              </p>
            </div>
          </Card>

          {/* Logout */}
          <button
            onClick={() => { logout(); navigate('/login') }}
            style={{
              width: '100%', background: 'var(--s0)', border: '1px solid var(--bd)',
              borderRadius: 'var(--r-md)', padding: '14px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--r)',
              fontSize: 15, fontWeight: 600, marginBottom: 8,
            }}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </>
      ) : (
        /* Edit mode */
        <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <div style={{ padding: '16px' }}>
              <p className="input-label" style={{ marginBottom: 12 }}>Your skills</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SKILL_OPTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    style={{
                      padding: '7px 14px', borderRadius: 999,
                      border: `1.5px solid ${form.skills.includes(s) ? 'var(--a)' : 'var(--bd2)'}`,
                      background: form.skills.includes(s) ? 'var(--al)' : 'var(--s1)',
                      color: form.skills.includes(s) ? 'var(--a2)' : 'var(--t2)',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ padding: '16px' }}>
              <p className="input-label" style={{ marginBottom: 12 }}>Languages</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {LANG_OPTIONS.map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggleLang(l)}
                    style={{
                      padding: '7px 14px', borderRadius: 999,
                      border: `1.5px solid ${form.languages.includes(l) ? 'var(--a)' : 'var(--bd2)'}`,
                      background: form.languages.includes(l) ? 'var(--al)' : 'var(--s1)',
                      color: form.languages.includes(l) ? 'var(--a2)' : 'var(--t2)',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
                      transition: 'all 0.15s', textTransform: 'capitalize',
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Input
            label="Location"
            placeholder="e.g. Surulere, Lagos"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
          />

          <Input
            label="Daily rate expectation (₦)"
            type="number"
            placeholder="e.g. 4000"
            value={form.daily_rate_expectation}
            onChange={e => setForm(f => ({ ...f, daily_rate_expectation: e.target.value }))}
          />

          {error && (
            <p style={{ fontSize: 13, color: 'var(--r)', background: 'var(--rl)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button variant="amber" loading={saving} onClick={handleSave}>
              <Save size={16} />
              Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
