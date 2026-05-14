import { useTrader } from '../context/AppContext'
import { Button, ScoreHero, ProgressBar, StatCard, NotificationCard } from '../components/UI'
import { Navbar, TabBar } from '../components/Layout'

export default function EkoScorePage() {
  const { trader } = useTrader()

  const scoreBreakdown = [
    { label: 'Transaction volume', value: '30%' },
    { label: 'Tenure & recency', value: '25%' },
    { label: 'Cohort comparison', value: '20%' },
    { label: 'Behavioral stability', value: '15%' },
    { label: 'Identity tier', value: '10%' },
  ]

  return (
    <div className="pb-20">
      <Navbar title="My EkoScore" backLink="/dashboard" rightAction={<span className="text-xs text-gray-500">Updated today</span>} />
      
      <div className="px-4 py-4">
        {/* Score Hero */}
        <ScoreHero 
          score={trader.ekoScore}
          title="YOUR SCORE"
          subtitle="Top 20% of fabric traders - Lagos"
          progress={74}
        />

        {/* Signal Breakdown */}
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">Signal breakdown</h3>
          <div className="space-y-3 bg-white rounded-lg p-3">
            {scoreBreakdown.map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-700">{item.label}</label>
                  <span className="text-xs font-mono text-gray-600">{item.value}</span>
                </div>
                <ProgressBar value={parseInt(item.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Unlock Status */}
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-2 text-gray-900">Unlock status</h3>
          <div className="space-y-2 bg-white rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <div className="text-sm">
                <p className="font-medium text-gray-900">EkoSave</p>
                <p className="text-xs text-gray-600">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <div className="text-sm">
                <p className="font-medium text-gray-900">EkoCredit (score ≥ 60)</p>
                <p className="text-xs text-gray-600">Eligible</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <div className="text-sm">
                <p className="font-medium text-gray-900">Job posting</p>
                <p className="text-xs text-gray-600">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔄</span>
              <div className="text-sm">
                <p className="font-medium text-gray-900">Large advance (score ≥ 80)</p>
                <p className="text-xs text-gray-600">74 / 80</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <NotificationCard 
          icon="💡"
          title="Unlock larger advances"
          body="Adding NIB verification increases your ceiling by up to 8 points."
          cta={<Button variant="ghost" size="sm">Add NIB verification</Button>}
        />
      </div>

      <TabBar />
    </div>
  )
}
