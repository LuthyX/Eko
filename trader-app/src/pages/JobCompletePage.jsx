import { Badge, Button, Card } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function JobCompletePage() {
  return (
    <div className="pb-20">
      <Navbar title="" />
      
      <div className="px-4 py-8 text-center">
        {/* Success Icon */}
        <div className="text-6xl mb-4">✓</div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Job complete!</h1>
        <p className="text-sm text-gray-600 mb-6">₦12,000 is being sent to Emeka</p>

        {/* Job Info */}
        <Card className="mb-6">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-gray-900 mb-1">Market sales assistant</h3>
            <p className="text-xs text-gray-600 font-mono">Balogum Market</p>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Paid to</span>
              <span className="font-semibold text-gray-900">Emeka Okonkwo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount</span>
              <span className="font-mono text-green-600 font-semibold">₦12,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Via</span>
              <span className="font-mono text-gray-900">Squad transfer</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className="text-orange-600 font-semibold">Processing</span>
            </div>
          </div>
        </Card>

        {/* Seeker Profile */}
        <Card className="mb-6">
          <h3 className="font-semibold text-sm mb-3 text-gray-900 text-left">Seeker profile</h3>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center font-bold text-yellow-900">EO</div>
            <div className="text-left">
              <p className="font-semibold text-sm text-gray-900">Emeka Okonkwo</p>
              <p className="text-xs text-gray-600 font-mono">Supilere · 2 jobs completed · 4.8 ★</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full">View profile</Button>
        </Card>

        {/* Rating */}
        <Card className="mb-6">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">Rate Emeka</h3>
          <div className="text-4xl tracking-widest mb-3">★ ★ ★ ★ ★</div>
          <textarea className="w-full border border-gray-300 rounded p-2 text-sm text-gray-600 mb-2" placeholder="Add a comment (optional)"></textarea>
          <Button variant="primary" size="lg">Submit rating</Button>
        </Card>
      </div>

      <TabBar />
    </div>
  )
}
