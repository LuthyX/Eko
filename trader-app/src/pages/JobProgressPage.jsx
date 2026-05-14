import { Badge, Button, Card, ProgressBar } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function JobProgressPage() {
  return (
    <div className="pb-20">
      <Navbar title="Job in progress" rightAction={<Badge color="yellow">IN PROGRESS</Badge>} />
      
      <div className="px-4 py-4">
        {/* Job Details */}
        <Card className="mb-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-600">Market sales assistant</p>
            <p className="text-xs text-gray-500 font-mono">Balogum Market</p>
          </div>
          <div className="bg-gray-50 rounded p-2 text-center">
            <p className="text-2xl font-semibold text-green-600">₦4,888/day</p>
            <p className="text-xs text-gray-600 font-mono">Day 3 of 3 — last day</p>
          </div>
        </Card>

        {/* Progress */}
        <Card className="mb-4">
          <p className="text-xs text-gray-600 uppercase font-mono mb-2">Progress</p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-900">Completed</span>
                <span className="text-xs text-gray-600 font-mono">2/3 days</span>
              </div>
              <ProgressBar value={66} />
            </div>
          </div>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200 mb-4 text-xs text-blue-800 leading-relaxed">
          <p>ℹ ₦12,000 releases to your Squad account when Emeka marks job complete.</p>
        </Card>

        <Button variant="primary" size="lg">Mark complete - Pay ₦12,000</Button>
      </div>

      <TabBar />
    </div>
  )
}
