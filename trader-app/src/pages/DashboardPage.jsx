import { useTrader } from '../context/AppContext'
import { Button, StatCard, ScoreHero, Badge, Card, Transaction } from '../components/UI'
import { Header, Navbar, TabBar } from '../components/Layout'

export default function DashboardPage() {
  const { trader } = useTrader()

  return (
    <div className="pb-20">
      <Navbar title={`Good morning, ${trader.name || 'Amaka'} 🔥`} />
      
      <div className="px-4 py-4">
        {/* EkoScore Hero */}
        <ScoreHero 
          score={trader.ekoScore}
          title="EKOSCORE"
          subtitle={`${trader.scoreChange > 0 ? '↑' : '↓'} ${Math.abs(trader.scoreChange)} · ${trader.riskLevel} verified`}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard label="30-day volume" value={`₦${(trader.balance / 1000000).toFixed(1)}M`} />
          <StatCard label="Score trend" value={`${trader.scoreChange > 0 ? '+' : ''}${trader.scoreChange}3`} />
          <StatCard label="Active jobs" value={trader.activeJobs} />
          <StatCard label="Earning" value={`₦${trader.earnedBalance / 1000}K`} />
        </div>

        {/* EkoCredit Offer */}
        <Card className="bg-green-50 border-green-200 mb-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs text-green-700 uppercase font-mono tracking-wider mb-1">EKOCREDIT OFFER</p>
              <p className="text-3xl font-light text-green-900 leading-tight">₦{trader.ekoCredit.amount.toLocaleString()}</p>
            </div>
            <span className="text-2xl">⭐</span>
          </div>
          <p className="text-xs text-green-800 mb-3">Revenue-based advance. auto-repaid from Squad receipts. No fixed instalments</p>
          <Button variant="primary" size="lg">Apply now</Button>
        </Card>

        {/* Recent Transactions */}
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-2 text-gray-900">Recent transactions</h3>
          <div className="bg-white rounded-lg p-3">
            <Transaction icon="✓" title="Payment received - Customer" date="Yesterday 15:10" amount="+₦56,888" type="in" />
            <Transaction icon="↗" title="EkoCredit repayment - auto" date="Yesterday 10:15" amount="-₦3,600" type="out" />
            <Transaction icon="🏦" title="EkoSave sweep - 3%" date="Yesterday 08:30" amount="-₦728" type="out" />
            <Transaction icon="💰" title="Wage payout - Emeka" date="Yesterday 16:28" amount="-₦12,800" type="out" />
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
