import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Zap, MapPin, Star, CheckCircle, Award, Phone, User } from 'lucide-react'
import { matchApi } from '@/api'
import { formatNaira, getMatchScoreColor } from '@/utils'
import { Card, Badge, Button, Spinner, EmptyState, PageHeader, BottomSheet, Avatar } from '@/components/ui'
import type { ApplicantRankedResponse, OpportunityResponse, CompleteJobResponse, SeekerProfileResponse } from '@/types'

export default function ApplicantsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [opp, setOpp] = useState<OpportunityResponse | null>(null)
  const [applicants, setApplicants] = useState<ApplicantRankedResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<number | null>(null)
  const [completing, setCompleting] = useState<number | null>(null)
  const [completeResult, setCompleteResult] = useState<CompleteJobResponse | null>(null)
  const [contactApplicant, setContactApplicant] = useState<ApplicantRankedResponse | null>(null)
  const [profileApplicant, setProfileApplicant] = useState<ApplicantRankedResponse | null>(null)
  const [seekerProfile, setSeekerProfile] = useState<SeekerProfileResponse | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [ratingMatchId, setRatingMatchId] = useState<number | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [ratingDone, setRatingDone] = useState<Set<number>>(new Set())

  const oppId = parseInt(id!)

  const load = async () => {
    try {
      const [o, a] = await Promise.all([
        matchApi.getOpportunity(oppId),
        matchApi.getApplicants(oppId),
      ])
      setOpp(o)
      setApplicants(a)
    } catch (e) {
      console.error('load error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [oppId])

  const handleAccept = async (matchId: number) => {
    setAccepting(matchId)
    try {
      await matchApi.acceptApplicant(matchId)
      load()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to accept')
    } finally {
      setAccepting(null)
    }
  }

  const handleComplete = async (matchId: number) => {
    setCompleting(matchId)
    try {
      const result = await matchApi.completeJob(matchId)
      setCompleteResult(result)
      load()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to complete job')
    } finally {
      setCompleting(null)
    }
  }

  const openSeekerProfile = async (applicant: ApplicantRankedResponse) => {
    setProfileApplicant(applicant)
    setSeekerProfile(null)
    setLoadingProfile(true)
    try {
      const p = await matchApi.getSeekerProfile(applicant.job_seeker_id)
      setSeekerProfile(p)
    } catch { /* show what we have from applicant card */ }
    finally { setLoadingProfile(false) }
  }

  const handleRate = async () => {
    if (!ratingMatchId || ratingValue === 0) return
    setSubmittingRating(true)
    try {
      await matchApi.rateMatch(ratingMatchId, ratingValue, ratingComment || undefined)
      setRatingDone(prev => new Set([...prev, ratingMatchId]))
      setRatingMatchId(null)
      setRatingValue(0)
      setRatingComment('')
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Rating failed')
    } finally {
      setSubmittingRating(false)
    }
  }

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
      <Spinner size={32} />
    </div>
  )

  const hasAccepted = applicants.some(a => a.status === 'accepted')

  return (
    <div className="page-content stagger" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <PageHeader title="Applicants" subtitle={opp?.title || ''} back={() => navigate('/trader/jobs')} />

      {/* Opportunity summary */}
      {opp && (
        <Card className="animate-fade-in-up" style={{ marginTop: 16, marginBottom: 16, background: 'var(--s1)' }}>
          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{opp.title}</p>
              <p style={{ fontSize: 12, color: 'var(--t2)' }}>
                {formatNaira(opp.daily_pay)}/day · {opp.duration_days}d · {opp.location.split(',')[0]}
              </p>
            </div>
            <Badge variant={opp.status === 'open' ? 'green' : opp.status === 'in_progress' ? 'amber' : 'gray'}>
              {opp.status === 'in_progress' ? 'Active' : opp.status}
            </Badge>
          </div>
        </Card>
      )}

      {applicants.length > 0 && (
        <div className="animate-fade-in-up" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 14px', background: 'var(--gl)', borderRadius: 'var(--r-md)', border: '1px solid var(--gm)' }}>
          <Zap size={14} color="var(--g)" />
          <p style={{ fontSize: 12, color: 'var(--g2)', fontWeight: 600 }}>Ranked by Claude AI — highest match first</p>
        </div>
      )}

      {applicants.length === 0 ? (
        <EmptyState icon={<Award size={24} />} title="No applicants yet" description="Share this job or wait for seekers to apply" />
      ) : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {applicants.map((applicant, idx) => {
            const scoreColor = getMatchScoreColor(applicant.match_score || 0)
            const isAccepted = applicant.status === 'accepted'
            const isCompleted = applicant.status === 'completed'
            const alreadyRated = ratingDone.has(applicant.match_id)

            return (
              <Card
                key={applicant.match_id}
                className="animate-fade-in-up"
                style={{
                  borderColor: isAccepted ? 'var(--gm)' : undefined,
                  background: isAccepted ? 'linear-gradient(135deg, var(--gl) 0%, #fff 100%)' : undefined,
                }}
              >
                <div style={{ padding: '16px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => openSeekerProfile(applicant)}>
                      <Avatar name={applicant.job_seeker_name || 'A'} size={44} />
                      {idx === 0 && !hasAccepted && (
                        <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: 'var(--a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Star size={9} color="#fff" fill="#fff" />
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p
                            style={{ fontSize: 15, fontWeight: 700, marginBottom: 2, cursor: 'pointer' }}
                            onClick={() => openSeekerProfile(applicant)}
                          >
                            {applicant.job_seeker_name || 'Applicant'}
                          </p>
                          {applicant.job_seeker_location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={11} color="var(--t3)" />
                              <p style={{ fontSize: 12, color: 'var(--t2)' }}>{applicant.job_seeker_location}</p>
                            </div>
                          )}
                        </div>
                        <div style={{ background: scoreColor + '18', border: `1.5px solid ${scoreColor}40`, borderRadius: 10, padding: '4px 10px', textAlign: 'center', flexShrink: 0 }}>
                          <p style={{ fontSize: 20, fontWeight: 900, color: scoreColor, letterSpacing: '-0.03em', lineHeight: 1 }}>
                            {(applicant.match_score || 0).toFixed(0)}%
                          </p>
                          <p style={{ fontSize: 9, color: scoreColor, fontWeight: 600, opacity: 0.7 }}>MATCH</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI reasoning */}
                  {applicant.match_reasoning && (
                    <div style={{ background: applicant.engine_used === 'claude' ? 'var(--gl)' : 'var(--s1)', borderRadius: 'var(--r-sm)', padding: '10px 12px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      {applicant.engine_used === 'claude' && <Zap size={12} color="var(--g)" style={{ flexShrink: 0, marginTop: 1 }} />}
                      <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.5, fontStyle: 'italic' }}>"{applicant.match_reasoning}"</p>
                    </div>
                  )}

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {applicant.job_seeker_skills?.slice(0, 3).map(s => (
                      <span key={s} style={{ fontSize: 11, background: 'var(--s1)', color: 'var(--t2)', padding: '3px 8px', borderRadius: 6 }}>{s}</span>
                    ))}
                    {applicant.job_seeker_languages?.slice(0, 2).map(l => (
                      <span key={l} style={{ fontSize: 11, background: 'var(--bl)', color: 'var(--b)', padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{l}</span>
                    ))}
                    {applicant.job_seeker_daily_rate && (
                      <span style={{ fontSize: 11, background: 'var(--al)', color: 'var(--a2)', padding: '3px 8px', borderRadius: 6 }}>
                        {formatNaira(applicant.job_seeker_daily_rate)}/day
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  {isCompleted ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={16} color="var(--g)" />
                        <p style={{ fontSize: 13, color: 'var(--g)', fontWeight: 600 }}>Job completed · Paid</p>
                      </div>
                      {!alreadyRated ? (
                        <button
                          onClick={() => setRatingMatchId(applicant.match_id)}
                          style={{ background: 'var(--al)', border: '1px solid var(--am)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--a2)', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}
                        >
                          <Star size={14} />
                          Rate {applicant.job_seeker_name?.split(' ')[0] || 'worker'}
                        </button>
                      ) : (
                        <p style={{ fontSize: 12, color: 'var(--t3)' }}>✓ Rated</p>
                      )}
                    </div>
                  ) : isAccepted ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {applicant.job_seeker_phone && (
                        <button
                          onClick={() => setContactApplicant(applicant)}
                          style={{ background: 'var(--gl)', border: '1px solid var(--gm)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--g2)', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}
                        >
                          <Phone size={14} />
                          Contact {applicant.job_seeker_name?.split(' ')[0] || 'worker'}
                        </button>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'var(--gl)', borderRadius: 'var(--r-sm)', border: '1px solid var(--gm)' }}>
                          <CheckCircle size={14} color="var(--g)" />
                          <p style={{ fontSize: 13, color: 'var(--g2)', fontWeight: 600 }}>Accepted</p>
                        </div>
                        <Button
                          variant="primary"
                          fullWidth={false}
                          loading={completing === applicant.match_id}
                          onClick={() => handleComplete(applicant.match_id)}
                          style={{ padding: '10px 16px', fontSize: 13 }}
                        >
                          Complete & pay
                        </Button>
                      </div>
                    </div>
                  ) : applicant.status === 'rejected' ? (
                    <p style={{ fontSize: 12, color: 'var(--t3)' }}>Not selected</p>
                  ) : !hasAccepted ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button variant="secondary" size="sm" fullWidth={false} onClick={() => openSeekerProfile(applicant)} style={{ flex: 1 }}>
                        <User size={14} /> Profile
                      </Button>
                      <Button
                        variant={idx === 0 ? 'primary' : 'secondary'}
                        size="sm"
                        fullWidth={false}
                        loading={accepting === applicant.match_id}
                        onClick={() => handleAccept(applicant.match_id)}
                        style={{ flex: 1 }}
                      >
                        {idx === 0 ? '⭐ Accept' : 'Accept'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Complete success sheet */}
      <BottomSheet open={!!completeResult} onClose={() => setCompleteResult(null)} title="Job Complete 🎉">
        {completeResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gl)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={32} color="var(--g)" />
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{completeResult.message}</p>
            </div>
            <div style={{ background: 'var(--s1)', borderRadius: 'var(--r-md)', padding: '14px' }}>
              {[
                [`${completeResult.job_seeker_name || 'Worker'} receives`, formatNaira(completeResult.total_pay_naira)],
                ['Platform fee (5%)', formatNaira(completeResult.platform_fee_naira)],
                ['Total from wallet', formatNaira(completeResult.total_charged_naira)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <p style={{ fontSize: 13, color: 'var(--t2)' }}>{k}</p>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{v}</p>
                </div>
              ))}
            </div>
            <Button onClick={() => { setCompleteResult(null); load() }}>Done — rate the worker</Button>
          </div>
        )}
      </BottomSheet>

      {/* Contact sheet */}
      <BottomSheet open={!!contactApplicant} onClose={() => setContactApplicant(null)} title="Contact Details">
        {contactApplicant && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={contactApplicant.job_seeker_name || 'A'} size={56} />
              <div>
                <p style={{ fontSize: 18, fontWeight: 700 }}>{contactApplicant.job_seeker_name}</p>
                {contactApplicant.job_seeker_location && (
                  <p style={{ fontSize: 13, color: 'var(--t2)' }}>{contactApplicant.job_seeker_location}</p>
                )}
              </div>
            </div>
            {contactApplicant.job_seeker_phone ? (
              <a
                href={`tel:${contactApplicant.job_seeker_phone}`}
                style={{ background: 'var(--g)', color: '#fff', borderRadius: 'var(--r-md)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: 'var(--shadow-green)' }}
              >
                <Phone size={18} />
                {contactApplicant.job_seeker_phone}
              </a>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--t2)', textAlign: 'center' }}>No phone number on file</p>
            )}
            <p style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center' }}>
              Tap to call or copy to WhatsApp
            </p>
          </div>
        )}
      </BottomSheet>

      {/* Seeker profile sheet */}
      <BottomSheet open={!!profileApplicant} onClose={() => { setProfileApplicant(null); setSeekerProfile(null) }} title="Worker Profile">
        {profileApplicant && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={profileApplicant.job_seeker_name || 'A'} size={56} />
              <div>
                <p style={{ fontSize: 18, fontWeight: 700 }}>{profileApplicant.job_seeker_name}</p>
                {profileApplicant.job_seeker_location && (
                  <p style={{ fontSize: 13, color: 'var(--t2)' }}>{profileApplicant.job_seeker_location}</p>
                )}
              </div>
            </div>
            {loadingProfile ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size={24} /></div>
            ) : seekerProfile ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Jobs Done', value: String(seekerProfile.jobs_completed) },
                    { label: 'Avg Rating', value: seekerProfile.avg_rating > 0 ? `${seekerProfile.avg_rating.toFixed(1)}★` : '—' },
                    { label: 'Completion', value: seekerProfile.jobs_accepted > 0 ? `${(seekerProfile.completion_rate * 100).toFixed(0)}%` : '—' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--s1)', borderRadius: 'var(--r-sm)', padding: '12px', textAlign: 'center' }}>
                      <p style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>{s.value}</p>
                      <p style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge variant={seekerProfile.reliability_label === 'Excellent' ? 'green' : seekerProfile.reliability_label === 'Good' ? 'blue' : 'gray'}>
                    {seekerProfile.reliability_label}
                  </Badge>
                  {seekerProfile.daily_rate_expectation && (
                    <span style={{ fontSize: 13, color: 'var(--t2)' }}>Expects {formatNaira(seekerProfile.daily_rate_expectation)}/day</span>
                  )}
                </div>
                {seekerProfile.skills && seekerProfile.skills.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Skills</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {seekerProfile.skills.map(s => (
                        <span key={s} style={{ fontSize: 12, background: 'var(--s2)', color: 'var(--t1)', padding: '4px 10px', borderRadius: 6 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {seekerProfile.languages && seekerProfile.languages.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Languages</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {seekerProfile.languages.map(l => (
                        <span key={l} style={{ fontSize: 12, background: 'var(--bl)', color: 'var(--b)', padding: '4px 10px', borderRadius: 6, textTransform: 'capitalize' }}>{l}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--t2)', textAlign: 'center' }}>Profile not available</p>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Rating sheet */}
      <BottomSheet open={ratingMatchId !== null} onClose={() => { setRatingMatchId(null); setRatingValue(0); setRatingComment('') }} title="Rate this worker">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--t2)' }}>How was your experience working with this person?</p>
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
            <textarea className="input" placeholder="e.g. Showed up on time, worked hard..." value={ratingComment} onChange={e => setRatingComment(e.target.value)} rows={3} />
          </div>
          <Button onClick={handleRate} loading={submittingRating} disabled={ratingValue === 0}>
            Submit rating
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
