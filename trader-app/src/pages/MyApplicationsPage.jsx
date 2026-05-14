import { Badge, Card, Button } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function MyApplicationsPage() {
  return (
    <div className="pb-20">
      <Navbar title="My applications" />
      
      <div className="px-4 py-4">
        {/* Accepted */}
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-2 text-gray-900">Accepted</h3>
          <Card className="border-green-200 bg-white mb-2">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-sm text-gray-900">Market sales assistant</p>
                <p className="text-xs text-gray-600 font-mono">Balogum Market</p>
              </div>
              <Badge color="green">APPLIED</Badge>
            </div>
            <p className="text-xs text-gray-600 mb-2">₦4,888/day · 3 days</p>
            <p className="text-xs text-gray-500 mb-2 font-mono">From Match Score: 94% · strong fit. Waiting for Amaka to review · applied 2h ago</p>
            <Button variant="ghost" size="sm" className="w-full text-xs">View details</Button>
          </Card>
        </div>

        {/* Completed */}
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-2 text-gray-900">Completed</h3>
          <Card className="border-blue-200 bg-white mb-2">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-sm text-gray-900">Loading & delivery - Mile 12</p>
                <p className="text-xs text-gray-600 font-mono">Mile 12</p>
              </div>
              <Badge color="blue">COMPLETED</Badge>
            </div>
            <p className="text-xs text-gray-600 mb-2">₦2,500/day · Apr 28</p>
            <p className="text-xs text-gray-500 mb-2 font-mono">Paid - Apr 28</p>
            <Button variant="ghost" size="sm" className="w-full text-xs">+₦17,500</Button>
          </Card>

          <Card className="border-blue-200 bg-white mb-2">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-sm text-gray-900">Shop keeping - Computer Village</p>
                <p className="text-xs text-gray-600 font-mono">Computer Village</p>
              </div>
              <Badge color="blue">COMPLETED</Badge>
            </div>
            <p className="text-xs text-gray-600 mb-2">₦3,888/day · Apr 15</p>
            <p className="text-xs text-gray-500 mb-2 font-mono">Paid - Apr 15</p>
            <Button variant="ghost" size="sm" className="w-full text-xs">+₦17,500</Button>
          </Card>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
