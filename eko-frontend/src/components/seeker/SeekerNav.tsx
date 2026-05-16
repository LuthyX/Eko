import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Briefcase, Wallet, User } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/seeker', label: 'Jobs', icon: Home },
  { path: '/seeker/applications', label: 'Applied', icon: Briefcase },
  { path: '/seeker/earnings', label: 'Earnings', icon: Wallet },
  { path: '/seeker/profile', label: 'Me', icon: User },
]

export default function SeekerNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    if (path === '/seeker') return location.pathname === '/seeker'
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
            className={`nav-item ${active ? 'active-amber' : ''}`}
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
                background: 'var(--a)',
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
