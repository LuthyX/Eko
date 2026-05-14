import { Button, ApplicantCard, Badge } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function ApplicantsPage() {
  const applicants = [
    {
      initials: 'EO',
      name: 'Emeka Okonkwo',
      experience: '2.1kb · Last login 9s',
      match: 96,
      bio: 'Yoruba speaker, prior market sales experience, 2.1m away — strong fit across all criteria',
    },
    {
      initials: 'AF',
      name: 'Adesola Fashola',
      experience: '1.6kb · Yoruba · 8.2m',
      match: 88,
      bio: 'Very close, fluent Yoruba. Less sales experience but consistent work history',
    },
    {
      initials: 'TI',
      name: 'Taiwo Idowu',
      experience: '1.3kb · Yoruba · 5.1k',
      match: 71,
      bio: 'Good sales background but no Yoruba',
    },
  ]

  return (
    <div className="pb-20">
      <Navbar title="Applicants: 5" rightAction={<Badge color="green">AI RANKED</Badge>} />
      
      <div className="px-4 py-4">
        {/* Applicants */}
        <div className="space-y-2">
          {applicants.map((applicant, i) => (
            <ApplicantCard
              key={i}
              initials={applicant.initials}
              name={applicant.name}
              experience={applicant.experience}
              match={applicant.match}
              bio={applicant.bio}
              actions={
                <div className="flex gap-1">
                  <Button variant="danger" size="sm" className="flex-1 !py-1">✕ Decline</Button>
                  <Button variant="primary" size="sm" className="flex-1 !py-1">✓ Accept</Button>
                </div>
              }
            />
          ))}
        </div>

        {/* Explanation */}
        <div className="mt-4 p-3 bg-green-50 rounded-lg text-xs text-green-800">
          <p className="mb-2">✨ Claude will rank applicants by fit when they apply</p>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
