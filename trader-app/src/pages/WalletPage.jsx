import { useEffect, useState } from 'react'
import { useAuth } from '../context/AppContext'
import { walletService } from '../api/services'
import { Button, Transaction } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function WalletPage() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const [walletRes, txRes] = await Promise.all([
          walletService.getBalance(),
          walletService.getTransactions(20),
        ])
        setWallet(walletRes.data)
        setTransactions(txRes.data)
      } catch (err) {
        console.error('Failed to fetch wallet data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchWalletData()
  }, [])

  const balance = wallet?.balance || 0
  const savingBalance = wallet?.saving_account_balance || 0

  return (
    <div className="pb-20">
      <Navbar title="Wallet" />
      
      <div className="px-4 py-4">
        {/* Virtual Account */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-mono mb-2">VIRTUAL ACCOUNT</p>
          <p className="text-3xl font-semibold text-gray-900 mb-3">₦{balance.toLocaleString()}</p>
          <p className="text-xs text-gray-600 mb-4 font-mono">{wallet?.account_number} · {wallet?.bank_name} · {user?.full_name}</p>
          
          <div className="flex gap-2">
            <Button variant="primary" size="sm" className="flex-1">Send</Button>
            <Button variant="ghost" size="sm" className="flex-1">Receive</Button>
            <Button variant="ghost" size="sm" className="flex-1">Pay</Button>
          </div>
        </div>

        {/* Earning Vault */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-mono mb-2">EARNING VAULT</p>
          <p className="text-2xl font-semibold text-gray-900 mb-1">₦{savingBalance.toLocaleString()}</p>
          <p className="text-xs text-gray-600 mb-3">Auto-sweeps 3% of every Squad receipt</p>
          <Button variant="ghost" size="lg">Withdraw</Button>
        </div>

        {/* Recent Transactions */}
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">Recent transactions</h3>
          <div className="bg-white rounded-lg p-3">
            {transactions.length > 0 ? (
              transactions.map((tx, i) => (
                <Transaction
                  key={i}
                  icon={tx.type === 'in' ? '✓' : '↗'}
                  title={tx.description}
                  date={new Date(tx.created_at).toLocaleDateString()}
                  amount={`${tx.type === 'in' ? '+' : '-'}₦${Math.abs(tx.amount).toLocaleString()}`}
                  type={tx.type}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500">No transactions yet</p>
            )}
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
