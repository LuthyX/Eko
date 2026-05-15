import { useEffect, useState } from 'react'
import { creditService } from '../api/services'
import { Button, CreditOffer, Card, Badge } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function EkoCreditPage() {
  const [credit, setCredit] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCredit = async () => {
      try {
        const response = await creditService.checkEligibility()
        setCredit(response.data)
      } catch (err) {
        console.error('Failed to fetch credit eligibility:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCredit()
  }, [])

  if (loading) {
    return (
      <div className="pb-20">
        <Navbar title="EkoCredit" />
        <div className="px-4 py-4">
          <p className="text-gray-600">Loading credit info...</p>
        </div>
        <TabBar />
      </div>
    )
  }

  const amount = credit?.eligible_amount || 180000
  const feePercent = 5
  const fee = Math.round(amount * (feePercent / 100))
  const totalRepay = amount + fee

  return (
    <div className="pb-20">
      <Navbar title="EkoCredit" backLink="/dashboard" rightAction={<Badge color="green">AM</Badge>} />
      
      <div className="px-4 py-4">
        {/* Credit Offer */}
        <CreditOffer
          amount={amount.toLocaleString()}
          description="Working capital advance. pay as you earn"
          terms={[
            `Score ${credit?.score || 74}`,
            `Risk ${credit?.risk_tier || 'A'}`,
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
              <span className="font-semibold text-gray-900">₦{amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Repayment rate</span>
              <span className="font-mono text-green-600 font-semibold">10% per receipt</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fixed instalments</span>
              <span className="font-mono text-gray-900 font-semibold">None ✓</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Fee ({feePercent}% flat)</span>
                <span className="font-mono text-gray-900">₦{fee.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-gray-900">Total to repay</span>
              <span className="text-gray-900">₦{totalRepay.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200 mb-4">
          <div className="text-xs text-blue-800 leading-relaxed">
            <p className="mb-2">✓ 10% swept automatically from each incoming Squad payment. No action needed</p>
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
