import { Badge, Card, StatCard, ProgressBar } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function LenderPortalPage() {
  const traders = [
    { initials: 'AM', name: 'Amaka M.', category: 'Fabric, Balogum', months: '8 months', risk: 'A', score: 74 },
    { initials: 'KB', name: 'Kunle B.', category: 'Tech retail, CV', months: '11 months', risk: 'A', score: 81 },
    { initials: 'NG', name: 'Ngozi G.', category: 'Perishables, Mile 12', months: 'New', risk: 'B', score: 61 },
    { initials: 'TD', name: 'Tunde D.', category: 'Cosmetics, Balogum', months: '4 months', risk: 'C', score: 54 },
  ]

  const riskColors = {
    'A': 'green',
    'B': 'amber',
    'C': 'red',
  }

  return (
    <div className="pb-20">
      <div className="bg-gray-900 text-white px-4 py-4">
        <h1 className="font-bold text-lg mb-1">Eko Lender Portal</h1>
        <p className="text-xs text-gray-400">FirstChoice MFB · Verified partner</p>
      </div>
      
      <div className="px-4 py-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard label="Deployed" value="₦44.2M" />
          <StatCard label="Active advances" value="38" />
          <StatCard label="Repayment rate" value="96.4%" className="text-green-600" />
        </div>

        {/* Pre-scored traders */}
        <h2 className="font-semibold text-sm mb-3 text-gray-900">Pre-scored traders</h2>
        <div className="space-y-2">
          {traders.map((trader, i) => (
            <Card key={i} className="cursor-pointer hover:bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-900">
                  {trader.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{trader.name}</p>
                  <p className="text-xs text-gray-600 font-mono">{trader.category}</p>
                  <p className="text-xs text-gray-500 mt-1">{trader.months} on platform</p>
                </div>
                <div className="text-right">
                  <Badge color={riskColors[trader.risk]}>{trader.risk}</Badge>
                  <p className="text-lg font-bold text-gray-900 mt-1">{trader.score}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200 text-xs text-blue-800 mt-4">
          <p>ℹ All scores SHAP-explained. Click any trader for full breakdown + Squad ledger.</p>
        </Card>
      </div>

      <TabBar />
    </div>
  )
}
