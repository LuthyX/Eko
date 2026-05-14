import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, TraderProvider } from './context/AppContext'
import ProtectedRoute from './components/ProtectedRoute'

// Auth Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Trader Pages
import DashboardPage from './pages/DashboardPage'
import EkoScorePage from './pages/EkoScorePage'
import WalletPage from './pages/WalletPage'
import EkoCreditPage from './pages/EkoCreditPage'
import RepaymentTrackerPage from './pages/RepaymentTrackerPage'
import MyPostingsPage from './pages/MyPostingsPage'
import ApplicantsPage from './pages/ApplicantsPage'
import JobProgressPage from './pages/JobProgressPage'
import JobCompletePage from './pages/JobCompletePage'

// Job Seeker Pages
import JobsNearYouPage from './pages/JobsNearYouPage'
import MyApplicationsPage from './pages/MyApplicationsPage'
import EarningsPage from './pages/EarningsPage'

// Lender Pages
import LenderPortalPage from './pages/LenderPortalPage'
import TraderDetailPage from './pages/TraderDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <TraderProvider>
        <Router>
          <div className="bg-gray-50 min-h-screen">
            <Routes>
              {/* Auth routes */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />

              {/* Trader routes - protected */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/score"
                element={
                  <ProtectedRoute>
                    <EkoScorePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wallet"
                element={
                  <ProtectedRoute>
                    <WalletPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/credit"
                element={
                  <ProtectedRoute>
                    <EkoCreditPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/credit/repayment"
                element={
                  <ProtectedRoute>
                    <RepaymentTrackerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/postings"
                element={
                  <ProtectedRoute>
                    <MyPostingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/job/:id/applicants"
                element={
                  <ProtectedRoute>
                    <ApplicantsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/job/:id/progress"
                element={
                  <ProtectedRoute>
                    <JobProgressPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/job/:id/complete"
                element={
                  <ProtectedRoute>
                    <JobCompletePage />
                  </ProtectedRoute>
                }
              />

              {/* Job seeker routes */}
              <Route
                path="/jobs"
                element={
                  <ProtectedRoute>
                    <JobsNearYouPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applications"
                element={
                  <ProtectedRoute>
                    <MyApplicationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/earnings"
                element={
                  <ProtectedRoute>
                    <EarningsPage />
                  </ProtectedRoute>
                }
              />

              {/* Lender routes */}
              <Route
                path="/lender"
                element={
                  <ProtectedRoute>
                    <LenderPortalPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lender/trader/:id"
                element={
                  <ProtectedRoute>
                    <TraderDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </TraderProvider>
    </AuthProvider>
  )
}
