import { Badge, Card, StatCard, ProgressBar, Button } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function TraderDetailPage() {
  return (
    <div className="pb-20">
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-base">Amaka M.</h1>
          <p className="text-xs text-gray-400">Fabric · Balogum Market</p>
        </div>
        <div className="text-right">
          <Badge color="green">Risk A</Badge>
          <p className="text-lg font-bold text-white mt-1">Score 74</p>
        </div>
      </div>
      
      <div className="px-4 py-4">
        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatCard label="Merchant history" value="8 months" />
          <StatCard label="30-day volume" value="₦2.4M" />
        </div>

        {/* Registered */}
        <Card className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 uppercase font-mono mb-1">Registered</p>
              <p className="font-semibold text-gray-900">₦180K</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase font-mono mb-1">Identity</p>
              <p className="font-semibold text-gray-900">BVN ✓</p>
            </div>
          </div>
        </Card>

        {/* EkoScore Breakdown */}
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">EkoScore breakdown</h3>
          <div className="bg-white rounded-lg p-3 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700">Transaction volume</span>
                <span className="text-xs font-mono text-gray-600">30%</span>
              </div>
              <ProgressBar value={30} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700">Tenure & recency</span>
                <span className="text-xs font-mono text-gray-600">25%</span>
              </div>
              <ProgressBar value={25} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700">Cohort comparison</span>
                <span className="text-xs font-mono text-gray-600">20%</span>
              </div>
              <ProgressBar value={20} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700">Behavioral stability</span>
                <span className="text-xs font-mono text-gray-600">20%</span>
              </div>
              <ProgressBar value={20} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700">Identity tier</span>
                <span className="text-xs font-mono text-gray-600">5%</span>
              </div>
              <ProgressBar value={5} />
            </div>
          </div>
        </div>

        {/* Current Advance */}
        <Card className="mb-4">
          <p className="text-xs text-gray-600 uppercase font-mono mb-2">Current advance</p>
          <p className="text-2xl font-semibold text-gray-900">₦146,200</p>
          <p className="text-xs text-green-600 font-mono mt-1">24% repaid</p>
        </Card>

        {/* Action */}
        <Button variant="primary" size="lg">Fund ₦180,000</Button>
        <Button variant="ghost" size="lg" className="mt-2">Decline</Button>
      </div>

      <TabBar />
    </div>
  )
}
