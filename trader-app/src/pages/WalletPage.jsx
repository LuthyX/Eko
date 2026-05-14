import { useTrader } from '../context/AppContext'
import { Button, Transaction } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function WalletPage() {
  const { trader } = useTrader()

  return (
    <div className="pb-20">
      <Navbar title="Wallet" />
      
      <div className="px-4 py-4">
        {/* Virtual Account */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-mono mb-2">VIRTUAL ACCOUNT</p>
          <p className="text-3xl font-semibold text-gray-900 mb-3">₦{trader.balance.toLocaleString()}</p>
          <p className="text-xs text-gray-600 mb-4 font-mono">0123456789 · GTBank · Amaka Okonkwo</p>
          
          <div className="flex gap-2">
            <Button variant="primary" size="sm" className="flex-1">Send</Button>
            <Button variant="ghost" size="sm" className="flex-1">Receive</Button>
            <Button variant="ghost" size="sm" className="flex-1">Pay</Button>
          </div>
        </div>

        {/* Earning Vault */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-mono mb-2">EARNING VAULT</p>
          <p className="text-2xl font-semibold text-gray-900 mb-1">₦{trader.earnedBalance.toLocaleString()}</p>
          <p className="text-xs text-gray-600 mb-3">Auto-sweeps 3% of every Squad receipt</p>
          <Button variant="ghost" size="lg">Withdraw</Button>
        </div>

        {/* Recent Transactions */}
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">Recent transactions</h3>
          <div className="bg-white rounded-lg p-3">
            <Transaction icon="✓" title="Payment received - Customer" date="Today 15:10" amount="+₦56,888" type="in" />
            <Transaction icon="↗" title="EkoCredit repayment - auto" date="Today 10:15" amount="-₦3,600" type="out" />
            <Transaction icon="🏦" title="EkoSave sweep - 3%" date="Yesterday 08:30" amount="-₦728" type="out" />
            <Transaction icon="💰" title="Wage payout - Emeka" date="Yesterday 16:28" amount="-₦12,800" type="out" />
            <Transaction icon="📱" title="Airtime - MTN ₦500" date="2 days ago" amount="-₦500" type="out" />
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
