import { useTrader } from '../context/AppContext'
import { Button, CreditOffer, Card, Badge } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function EkoCreditPage() {
  const { trader } = useTrader()
  const credit = trader.ekoCredit

  return (
    <div className="pb-20">
      <Navbar title="EkoCredit" backLink="/dashboard" rightAction={<Badge color="green">AM</Badge>} />
      
      <div className="px-4 py-4">
        {/* Credit Offer */}
        <CreditOffer
          amount={credit.amount.toLocaleString()}
          description="Working capital advance. pay as you earn"
          terms={[
            `Score ${trader.ekoScore}`,
            `Risk A`,
            'Credit eligible ✓'
          ]}
          cta={<Button variant="primary" size="lg">Apply now</Button>}
        />

        {/* Terms */}
        <Card className="mb-4">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">Terms</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Advance</span>
              <span className="font-semibold text-gray-900">₦{credit.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Repayment rate</span>
              <span className="font-mono text-green-600 font-semibold">{credit.repaymentRate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fixed instalments</span>
              <span className="font-mono text-gray-900 font-semibold">{credit.fixedInstalments}✓</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Fee (5% flat)</span>
                <span className="font-mono text-gray-900">₦{credit.fee.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-gray-900">Total to repay</span>
              <span className="text-gray-900">₦{credit.totalRepay.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200 mb-4">
          <div className="text-xs text-blue-800 leading-relaxed">
            <p className="mb-2">✓ 15% swept automatically from each incoming Squad payment. No action needed</p>
            <p>By confirming you authorise Eko to sweep 10% of each Squad payment until fully repaid.</p>
          </div>
        </Card>

        <Button variant="primary" size="lg">Apply now</Button>
        <Button variant="ghost" size="lg" className="mt-2">Not interested</Button>
      </div>

      <TabBar />
    </div>
  )
}
