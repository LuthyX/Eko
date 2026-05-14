import { Card, Button, Badge } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function EarningsPage() {
  return (
    <div className="pb-20">
      <Navbar title="Earnings" />
      
      <div className="px-4 py-4">
        {/* Balance */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 mb-4">
          <p className="text-xs text-green-700 uppercase tracking-wide font-mono mb-1">WALLET BALANCE</p>
          <p className="text-3xl font-semibold text-green-900 mb-1">₦35,700</p>
          <p className="text-xs text-green-800 font-mono mb-3">Squad VA · 0765764321 · GTBank</p>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" className="flex-1">Withdraw</Button>
            <Button variant="ghost" size="sm" className="flex-1">History</Button>
          </div>
        </Card>

        {/* Earnings History */}
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">Earnings history</h3>
          <div className="bg-white rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">Market sales - Amaka</p>
                  <p className="text-xs text-gray-600 font-mono">May 14 · completed</p>
                </div>
              </div>
              <p className="font-semibold text-green-600">+₦12,000</p>
            </div>
            
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚚</span>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">Loading - Mile 12</p>
                  <p className="text-xs text-gray-600 font-mono">May 30 · completed</p>
                </div>
              </div>
              <p className="font-semibold text-green-600">+₦6,000</p>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏪</span>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">Shop keeping - Kunle</p>
                  <p className="text-xs text-gray-600 font-mono">May 2 · completed</p>
                </div>
              </div>
              <p className="font-semibold text-green-600">+₦17,500</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="text-center">
            <p className="text-xs text-gray-500 font-mono mb-1">Jobs completed</p>
            <p className="text-2xl font-bold text-gray-900">3</p>
            <div className="flex justify-center gap-1 mt-2">
              {[1,2,3,4,5].map((i) => (
                <span key={i} className={i <= 4.8 ? '⭐' : '☆'}></span>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">4.8 avg</p>
          </Card>

          <Card className="text-center">
            <p className="text-xs text-gray-500 font-mono mb-1">Total earned</p>
            <p className="text-xl font-bold text-gray-900">₦35,500</p>
          </Card>

          <Card className="text-center">
            <p className="text-xs text-gray-500 font-mono mb-1">This month</p>
            <p className="text-sm text-gray-600 font-mono">+₦12,000</p>
          </Card>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
