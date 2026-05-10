import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'

// Layout
function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}

// Pages (placeholders)
function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900">Trader Dashboard</h1>
      <p className="text-gray-600 mt-2">Welcome to Eko Trader</p>
    </div>
  )
}

function OnboardingPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Trader Onboarding</h1>
    </div>
  )
}

function EkoScorePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">EkoScore Dashboard</h1>
    </div>
  )
}

function EkoCreditPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">EkoCredit</h1>
    </div>
  )
}

function OpportunitiesPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Post Opportunities</h1>
    </div>
  )
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/score" element={<EkoScorePage />} />
          <Route path="/credit" element={<EkoCreditPage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </Router>
  )
}
