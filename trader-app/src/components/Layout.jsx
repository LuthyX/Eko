import { Link, useLocation } from 'react-router-dom'

export function Navbar({ title, backLink, rightAction }) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2">
        {backLink && (
          <Link to={backLink} className="text-gray-600 hover:text-gray-900">
            ←
          </Link>
        )}
        <h1 className="font-bold text-lg text-gray-900">
          E<span className="text-green-500">k</span>o
        </h1>
      </div>
      <p className="text-sm font-medium text-gray-900 flex-1 ml-4">{title}</p>
      {rightAction && <div>{rightAction}</div>}
    </div>
  )
}

export function TabBar() {
  const location = useLocation()
  
  const tabs = [
    { icon: '🏠', label: 'Home', path: '/dashboard' },
    { icon: '📊', label: 'Score', path: '/score' },
    { icon: '💳', label: 'Credit', path: '/credit' },
    { icon: '👛', label: 'Wallet', path: '/wallet' },
    { icon: '⚙️', label: 'Settings', path: '/settings' },
  ]
  
  return (
    <div className="bg-white border-t border-gray-200 flex justify-around pt-2 pb-1 fixed bottom-0 left-0 right-0 z-40">
      {tabs.map((tab) => (
        <Link
          key={tab.path}
          to={tab.path}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-3 text-xs ${
            location.pathname === tab.path
              ? 'text-green-600'
              : 'text-gray-600'
          }`}
        >
          <span className="text-lg leading-none">{tab.icon}</span>
          <span className="font-medium">{tab.label}</span>
        </Link>
      ))}
    </div>
  )
}

export function PhoneFrame({ children, navbar = null }) {
  return (
    <div className="w-80 mx-auto bg-white rounded-2xl border border-gray-300 overflow-hidden shadow-lg">
      {navbar}
      <div className="bg-white overflow-y-auto" style={{ height: navbar ? 'calc(100vh - 100px)' : '100vh' }}>
        {children}
      </div>
    </div>
  )
}

export function Header({ title, subtitle, rightContent }) {
  return (
    <div className="px-4 py-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
      {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      {rightContent}
    </div>
  )
}
