import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, TraderProvider } from './context/AppContext'

// Pages
import DashboardPage from './pages/DashboardPage'
import EkoScorePage from './pages/EkoScorePage'
import WalletPage from './pages/WalletPage'
import EkoCreditPage from './pages/EkoCreditPage'
import RepaymentTrackerPage from './pages/RepaymentTrackerPage'
import MyPostingsPage from './pages/MyPostingsPage'
import ApplicantsPage from './pages/ApplicantsPage'
import JobProgressPage from './pages/JobProgressPage'
import JobCompletePage from './pages/JobCompletePage'
import JobsNearYouPage from './pages/JobsNearYouPage'
import MyApplicationsPage from './pages/MyApplicationsPage'
import EarningsPage from './pages/EarningsPage'
import LenderPortalPage from './pages/LenderPortalPage'
import TraderDetailPage from './pages/TraderDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <TraderProvider>
        <Router>
          <div className="bg-gray-50 min-h-screen">
            <Routes>
              {/* Trader routes */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/score" element={<EkoScorePage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/credit" element={<EkoCreditPage />} />
              <Route path="/credit/repayment" element={<RepaymentTrackerPage />} />
              <Route path="/postings" element={<MyPostingsPage />} />
              <Route path="/job/:id/applicants" element={<ApplicantsPage />} />
              <Route path="/job/:id/progress" element={<JobProgressPage />} />
              <Route path="/job/:id/complete" element={<JobCompletePage />} />
              
              {/* Job seeker routes */}
              <Route path="/jobs" element={<JobsNearYouPage />} />
              <Route path="/applications" element={<MyApplicationsPage />} />
              <Route path="/earnings" element={<EarningsPage />} />
              
              {/* Lender routes */}
              <Route path="/lender" element={<LenderPortalPage />} />
              <Route path="/lender/trader/:id" element={<TraderDetailPage />} />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </TraderProvider>
    </AuthProvider>
  )
}
