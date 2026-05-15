import { useEffect } from 'react'
import { useTrader } from '../context/AppContext'
import { useAuth } from '../context/AppContext'
import { Button, StatCard, ScoreHero, Badge, Card, Transaction } from '../components/UI'
import { Header, Navbar, TabBar } from '../components/Layout'

export default function DashboardPage() {
  const { user } = useAuth()
  const { trader, ekoScore, wallet, loading, loadTraderData } = useTrader()

  useEffect(() => {
    if (user?.id) {
      loadTraderData(user.id)
    }
  }, [user])

  const displayName = user?.full_name?.split(' ')[0] || 'Trader'
  const score = ekoScore?.score || 74
  const riskLevel = ekoScore?.risk_tier || 'A'
  const balance = wallet?.balance || 2400000
  const earnedBalance = wallet?.saving_account_balance || 48200

  return (
    <div className="pb-20">
      <Navbar title={`Good morning, ${displayName} 🔥`} />
      
      <div className="px-4 py-4">
        {/* EkoScore Hero */}
        <ScoreHero 
          score={score}
          title="EKOSCORE"
          subtitle={`${riskLevel} verified`}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard label="Account balance" value={`₦${(balance / 1000000).toFixed(1)}M`} />
          <StatCard label="Risk tier" value={riskLevel} />
          <StatCard label="Status" value="Active" />
          <StatCard label="Earned" value={`₦${earnedBalance / 1000}K`} />
        </div>

        {/* EkoCredit Offer */}
        <Card className="bg-green-50 border-green-200 mb-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs text-green-700 uppercase font-mono tracking-wider mb-1">EKOCREDIT OFFER</p>
              <p className="text-3xl font-light text-green-900 leading-tight">₦180,000</p>
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
