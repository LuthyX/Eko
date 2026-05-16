import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import TraderOnboardPage from '@/pages/auth/TraderOnboardPage'
import SeekerOnboardPage from '@/pages/auth/SeekerOnboardPage'

// Trader pages
import TraderHome from '@/pages/trader/TraderHome'
import FinancePage from '@/pages/trader/FinancePage'
import TraderJobsPage from '@/pages/trader/TraderJobsPage'
import PostJobPage from '@/pages/trader/PostJobPage'
import ApplicantsPage from '@/pages/trader/ApplicantsPage'
import WalletPage from '@/pages/trader/WalletPage'
import TraderProfilePage from '@/pages/trader/TraderProfilePage'
import TraderNav from '@/components/trader/TraderNav'

// Seeker pages
import SeekerHome from '@/pages/seeker/SeekerHome'
import JobDetailPage from '@/pages/seeker/JobDetailPage'
import SeekerApplicationsPage from '@/pages/seeker/SeekerApplicationsPage'
import SeekerEarningsPage from '@/pages/seeker/SeekerEarningsPage'
import SeekerProfilePage from '@/pages/seeker/SeekerProfilePage'
import SeekerNav from '@/components/seeker/SeekerNav'

// ── Loading screen ─────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 16,
    }}>
      <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em' }}>
        Ek<span style={{ color: 'var(--g)' }}>o</span>
      </div>
      <Spinner size={24} />
    </div>
  )
}

// ── Protected route ────────────────────────────────────────────────────────────

function ProtectedRoute({ roles }: { roles?: string[] }) {
  const { isAuthenticated, role, isLoading } = useAuth()

  if (isLoading) return <LoadingScreen />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && role && !roles.includes(role)) {
    return <Navigate to={role === 'job_seeker' ? '/seeker' : '/trader'} replace />
  }

  return <Outlet />
}

// ── Trader shell with bottom nav ───────────────────────────────────────────────

function TraderShell() {
  return (
    <div className="app-shell">
      <div className="page">
        <Outlet />
      </div>
      <TraderNav />
    </div>
  )
}

// ── Seeker shell with bottom nav ───────────────────────────────────────────────

function SeekerShell() {
  return (
    <div className="app-shell">
      <div className="page">
        <Outlet />
      </div>
      <SeekerNav />
    </div>
  )
}

// ── Auth shell (no nav) ────────────────────────────────────────────────────────

function AuthShell() {
  return (
    <div className="app-shell">
      <Outlet />
    </div>
  )
}

// ── Root redirect ──────────────────────────────────────────────────────────────

function RootRedirect() {
  const { isAuthenticated, role, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role === 'job_seeker') return <Navigate to="/seeker" replace />
  return <Navigate to="/trader" replace />
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth (public) */}
      <Route element={<AuthShell />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Onboarding (auth required, role-specific) */}
      <Route element={<ProtectedRoute roles={['trader']} />}>
        <Route element={<AuthShell />}>
          <Route path="/trader/onboard" element={<TraderOnboardPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['job_seeker']} />}>
        <Route element={<AuthShell />}>
          <Route path="/seeker/onboard" element={<SeekerOnboardPage />} />
        </Route>
      </Route>

      {/* Trader routes */}
      <Route element={<ProtectedRoute roles={['trader']} />}>
        <Route element={<TraderShell />}>
          <Route path="/trader" element={<TraderHome />} />
          <Route path="/trader/finance" element={<FinancePage />} />
          <Route path="/trader/jobs" element={<TraderJobsPage />} />
          <Route path="/trader/wallet" element={<WalletPage />} />
          <Route path="/trader/profile" element={<TraderProfilePage />} />
        </Route>
        {/* Full-screen pages (no bottom nav) */}
        <Route element={<AuthShell />}>
          <Route path="/trader/jobs/new" element={<PostJobPage />} />
          <Route path="/trader/jobs/:id/applicants" element={<ApplicantsPage />} />
        </Route>
      </Route>

      {/* Seeker routes */}
      <Route element={<ProtectedRoute roles={['job_seeker']} />}>
        <Route element={<SeekerShell />}>
          <Route path="/seeker" element={<SeekerHome />} />
          <Route path="/seeker/applications" element={<SeekerApplicationsPage />} />
          <Route path="/seeker/earnings" element={<SeekerEarningsPage />} />
          <Route path="/seeker/profile" element={<SeekerProfilePage />} />
        </Route>
        {/* Full-screen */}
        <Route element={<AuthShell />}>
          <Route path="/seeker/jobs/:id" element={<JobDetailPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
