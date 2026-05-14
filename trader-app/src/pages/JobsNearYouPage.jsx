import { Button, JobCard, Badge } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function JobsNearYouPage() {
  const jobs = [
    {
      title: 'Market sales assistant',
      location: 'Balogum Market · 2.1km',
      rate: '₦4,888/day',
      tags: ['Selling', 'Yoruba', '3 days'],
      match: 'BEST FIT',
    },
    {
      title: 'Shop keeper - electronics',
      location: 'Computer Village · 3.8km',
      rate: '₦3,888/day',
      tags: ['Shop keeping', 'English', '5 days'],
    },
    {
      title: 'Loading & delivery',
      location: 'Mile 12 · 7.2km',
      rate: '₦2,500/day',
      tags: ['Physical labor', '7 days'],
    },
  ]

  return (
    <div className="pb-20">
      <Navbar title="Jobs near you" rightAction={<span className="text-xs text-gray-500 font-mono">Matched to your skills</span>} />
      
      <div className="px-4 py-4">
        {jobs.map((job, i) => (
          <div key={i} className="mb-2.5">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{job.title}</p>
                  <p className="text-xs text-gray-500 font-mono">{job.location}</p>
                </div>
                {job.match && <Badge color="green">{job.match}</Badge>}
              </div>
              <div className="flex gap-1 flex-wrap mb-2">
                {job.tags.map((tag, j) => (
                  <span key={j} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="font-mono text-gray-900 font-semibold">{job.rate}</p>
                <Button variant="primary" size="sm" className="!w-auto">Apply now</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <TabBar />
    </div>
  )
}
