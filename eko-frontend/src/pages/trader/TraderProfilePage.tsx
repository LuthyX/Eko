import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, MapPin, Shield, CheckCircle, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api'
import { Card, Badge, Button, PageHeader, Avatar, Input, BottomSheet } from '@/components/ui'

export default function TraderProfilePage() {
  const { user, traderProfile, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [bvnSheet, setBvnSheet] = useState(false)
  const [bvn, setBvn] = useState('')
  const [nin, setNin] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  const handleVerify = async () => {
    if (!bvn && !nin) { setVerifyError('Enter BVN or NIN'); return }
    setVerifyError('')
    setVerifying(true)
    try {
      await authApi.verifyIdentity(bvn || undefined, nin || undefined)
      await refreshUser()
      setBvnSheet(false)
      setBvn('')
      setNin('')
    } catch (err: any) {
      setVerifyError(err?.response?.data?.detail || 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const identityTierLabel = {
    none: { label: 'Unverified', variant: 'gray' as const },
    bvn: { label: 'BVN Verified', variant: 'green' as const },
    nin: { label: 'NIN Verified', variant: 'green' as const },
    bvn_nin: { label: 'BVN + NIN', variant: 'green' as const },
  }

  const tierInfo = identityTierLabel[user?.identity_tier || 'none']
  const isVerified = user?.identity_tier !== 'none'

  return (
    <div className="page-content stagger" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <PageHeader title="My Profile" back={() => navigate(-1)} />

      {/* Hero */}
      <Card className="animate-fade-in-up" style={{ marginTop: 20, marginBottom: 12 }}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Avatar name={user?.full_name || 'T'} size={72} green />
          </div>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>{user?.full_name}</h2>
          <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 12 }}>{user?.email}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <Badge variant={tierInfo.variant}>{tierInfo.label}</Badge>
            {traderProfile?.squad_linked && <Badge variant="blue">Squad Linked</Badge>}
          </div>
        </div>
      </Card>

      {/* Business info */}
      {traderProfile && (
        <Card className="animate-fade-in-up" style={{ marginBottom: 12 }}>
          <div style={{ padding: '16px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 14 }}>Business</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Store size={16} color="var(--g)" />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Business Name</p>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{traderProfile.business_name || '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Store size={16} color="var(--g)" />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Category</p>
                  <p style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{traderProfile.business_category?.replace('_', ' ') || '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={16} color="var(--g)" />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Market Location</p>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{traderProfile.market_location || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Identity verification */}
      <Card className="animate-fade-in-up" style={{ marginBottom: 12, borderColor: isVerified ? 'var(--gm)' : 'var(--bd)', background: isVerified ? 'var(--gl)' : undefined }}>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isVerified ? 0 : 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: isVerified ? 'var(--g)' : 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color={isVerified ? '#fff' : 'var(--t3)'} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700 }}>Identity Verification</p>
              <p style={{ fontSize: 12, color: isVerified ? 'var(--g2)' : 'var(--t2)' }}>
                {isVerified ? `${tierInfo.label} · boosts your EkoScore by 10 points` : 'Verify BVN or NIN to unlock better credit'}
              </p>
            </div>
            {isVerified && <CheckCircle size={20} color="var(--g)" />}
          </div>
          {!isVerified && (
            <Button onClick={() => setBvnSheet(true)}>
              Verify identity
            </Button>
          )}
        </div>
      </Card>

      {/* Logout */}
      <div className="animate-fade-in-up" style={{ marginTop: 8 }}>
        <button
          onClick={() => { logout(); navigate('/login') }}
          style={{
            width: '100%', background: 'var(--s0)', border: '1px solid var(--bd)',
            borderRadius: 'var(--r-md)', padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--r)',
            fontSize: 15, fontWeight: 600,
          }}
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>

      {/* Identity verify sheet */}
      <BottomSheet open={bvnSheet} onClose={() => setBvnSheet(false)} title="Verify Identity">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.6 }}>
            Your BVN or NIN is stored as a tier only — never the raw number. Verification adds up to 10 points to your EkoScore.
          </p>
          <Input
            label="BVN (11 digits)"
            type="tel"
            placeholder="22190390831"
            value={bvn}
            onChange={e => setBvn(e.target.value)}
            maxLength={11}
          />
          <Input
            label="NIN (11 digits)"
            type="tel"
            placeholder="12345678901"
            value={nin}
            onChange={e => setNin(e.target.value)}
            maxLength={11}
          />
          {verifyError && (
            <p style={{ fontSize: 13, color: 'var(--r)', background: 'var(--rl)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>
              {verifyError}
            </p>
          )}
          <Button onClick={handleVerify} loading={verifying}>
            Verify now
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
