import { useLocation, useNavigate } from 'react-router-dom'
import { Home, BarChart2, Briefcase, Wallet, User } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/trader', label: 'Home', icon: Home },
  { path: '/trader/finance', label: 'Finance', icon: BarChart2 },
  { path: '/trader/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/trader/wallet', label: 'Wallet', icon: Wallet },
  { path: '/trader/profile', label: 'Me', icon: User },
]

export default function TraderNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    if (path === '/trader') return location.pathname === '/trader'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => {
        const Icon = item.icon
        const active = isActive(item.path)
        return (
          <button
            key={item.path}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            style={{ background: 'none', border: 'none' }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{ fontSize: 10, letterSpacing: '0.02em' }}>{item.label}</span>
            {active && (
              <div style={{
                position: 'absolute',
                bottom: -10,
                width: 4, height: 4,
                borderRadius: '50%',
                background: 'var(--g)',
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
