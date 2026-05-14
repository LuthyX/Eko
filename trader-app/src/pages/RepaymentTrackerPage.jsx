import { useTrader } from '../context/AppContext'
import { Badge, Card, Button } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function RepaymentTrackerPage() {
  const { trader } = useTrader()
  const credit = trader.ekoCredit

  return (
    <div className="pb-20">
      <Navbar title="My EkoCredit" rightAction={<Badge color="green">ACTIVE</Badge>} />
      
      <div className="px-4 py-4">
        {/* Status */}
        <Card className="mb-4 text-center">
          <p className="text-xs text-gray-600 uppercase tracking-wide font-mono mb-1">OUTSTANDING</p>
          <p className="text-3xl font-semibold text-gray-900 mb-2">₦{credit.available.toLocaleString()}</p>
          <div className="flex justify-center gap-4 text-sm">
            <div>
              <p className="text-gray-500">On track</p>
              <p className="text-green-600 font-semibold">✓ On track</p>
            </div>
          </div>
        </Card>

        {/* Info */}
        <Card className="mb-4 text-xs text-blue-800 bg-blue-50 border-blue-200">
          <p>ℹ 10% of every incoming Squad payment is swept automatically.</p>
        </Card>

        {/* Repayment Schedule */}
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">Repayment history</h3>
          <div className="bg-white rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Auto · 10% of ₦56,000</p>
                <p className="text-xs text-gray-600 font-mono">May 31 15:10</p>
              </div>
              <p className="font-semibold text-red-600">-₦5,600</p>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Auto · 10% of ₦24,000</p>
                <p className="text-xs text-gray-600 font-mono">May 30 16:28</p>
              </div>
              <p className="font-semibold text-red-600">-₦2,400</p>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">Auto · 10% of ₦204,000</p>
                <p className="text-xs text-gray-600 font-mono">May 28 08:33</p>
              </div>
              <p className="font-semibold text-red-600">-₦20,400</p>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-900">EkoCredit disbursement</p>
                <p className="text-xs text-gray-600 font-mono">May 27 15:02</p>
              </div>
              <p className="font-semibold text-green-600">+₦180,000</p>
            </div>
          </div>
        </div>

        {/* Automatic repayment note */}
        <Card className="bg-green-50 border-green-200 text-xs text-green-800 mb-4">
          <p className="flex items-start gap-2">
            <span>⭐</span>
            <span>Repayment starts automatically with your next Squad receipt.</span>
          </p>
        </Card>

        <Button variant="primary" size="lg">Back to home</Button>
      </div>

      <TabBar />
    </div>
  )
}
