import { useTrader } from '../context/AppContext'
import { JobCard, Badge, Button } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function MyPostingsPage() {
  const { trader } = useTrader()

  return (
    <div className="pb-20">
      <Navbar title="My postings" rightAction={<Button variant="primary" size="sm" className="!w-auto">+ Post job</Button>} />
      
      <div className="px-4 py-4">
        {/* Jobs */}
        <div className="space-y-2">
          {trader.jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">{job.title}</p>
                  <p className="text-xs text-gray-600 font-mono">{job.tags[0]}</p>
                </div>
                <Badge color={job.status === 'IN PROGRESS' ? 'yellow' : 'blue'}>{job.status}</Badge>
              </div>
              <div className="flex gap-2 mb-2">
                {job.tags.map((tag, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-mono text-gray-900">{job.rate}</p>
                <p className="text-xs text-gray-600">{job.applicants} applicants</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TabBar />
    </div>
  )
}
