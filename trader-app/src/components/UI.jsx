// Reusable UI Components

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const baseStyles = 'font-semibold font-sans rounded cursor-pointer transition-all'
  const variants = {
    primary: 'bg-green-500 text-white hover:bg-green-600',
    ghost: 'bg-transparent text-gray-900 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'w-full px-4 py-3 text-base',
  }
  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Badge({ children, color = 'green', className = '' }) {
  const colors = {
    green: 'bg-green-100 text-green-900',
    amber: 'bg-amber-100 text-amber-900',
    red: 'bg-red-100 text-red-900',
    blue: 'bg-blue-100 text-blue-900',
    yellow: 'bg-yellow-100 text-yellow-900',
  }
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${colors[color]} ${className}`}>
      {children}
    </span>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, subtext, className = '' }) {
  return (
    <div className={`bg-gray-100 rounded-lg p-3 ${className}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide font-mono mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      {subtext && <p className="text-xs text-gray-600 mt-1">{subtext}</p>}
    </div>
  )
}

export function ScoreHero({ score, title, subtitle, progress = 100 }) {
  return (
    <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg p-5 mb-3 relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white opacity-10"></div>
      <p className="text-xs text-white text-opacity-60 uppercase tracking-widest font-mono mb-1">{title}</p>
      <p className="text-5xl font-light text-white leading-tight mb-2">{score}</p>
      <p className="text-xs text-white text-opacity-70 mb-3">{subtitle}</p>
      <div className="bg-white bg-opacity-20 rounded-full h-1 mb-2 overflow-hidden">
        <div className="bg-white h-full rounded-full" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="flex justify-between text-xs text-white text-opacity-60 font-mono">
        <span>Last updated today</span>
      </div>
    </div>
  )
}

export function Transaction({ icon, title, date, amount, type = 'in' }) {
  const typeClass = type === 'in' ? 'text-green-600' : type === 'out' ? 'text-red-600' : 'text-gray-600'
  const bgClass = type === 'in' ? 'bg-green-50' : type === 'out' ? 'bg-red-50' : 'bg-gray-100'
  
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-200 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${bgClass}`}>
        <span className={`text-sm ${typeClass}`}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500 font-mono">{date}</p>
      </div>
      <p className={`text-sm font-semibold whitespace-nowrap ${typeClass}`}>{amount}</p>
    </div>
  )
}

export function JobCard({ title, location, rate, status, match, applicants, tags = [] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2.5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-sm text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 font-mono">{location}</p>
        </div>
        {status && <Badge color={status === 'PROGRESS' ? 'yellow' : 'blue'}>{status}</Badge>}
      </div>
      <div className="flex gap-1 flex-wrap mb-2">
        {tags.map((tag, i) => (
          <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">
            {tag}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <p className="text-gray-600">{rate}</p>
        {applicants && <p className="text-gray-600">{applicants} applicants</p>}
      </div>
    </div>
  )
}

export function ApplicantCard({ initials, name, experience, match, bio, actions }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2.5">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900">{name}</p>
          <p className="text-xs text-gray-500 font-mono">{experience}</p>
        </div>
        <Badge color={match > 85 ? 'green' : 'amber'}>{match}%</Badge>
      </div>
      {bio && <p className="text-xs text-gray-600 mb-2 bg-gray-50 p-2 rounded border-l-2 border-green-500">{bio}</p>}
      {actions && (
        <div className="flex gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}

export function ProgressStep({ number, label, completed, active }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
        completed ? 'bg-green-500 text-white' : active ? 'bg-green-50 text-green-700 border-2 border-green-500' : 'bg-gray-100 text-gray-500 border border-gray-300'
      }`}>
        {completed ? '✓' : number}
      </div>
      <p className="text-xs font-mono text-gray-600 text-center">{label}</p>
    </div>
  )
}

export function ProgressBar({ value = 50 }) {
  return (
    <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
      <div className="bg-green-500 h-full rounded-full" style={{ width: `${value}%` }}></div>
    </div>
  )
}

export function StatGrid({ stats = [] }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      {stats.map((stat, i) => (
        <StatCard key={i} label={stat.label} value={stat.value} />
      ))}
    </div>
  )
}

export function Stepper({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-0 mb-4">
      {steps.map((step, i) => (
        <div key={i} className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-0 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              i < currentStep ? 'bg-green-500 text-white' : i === currentStep ? 'bg-green-100 text-green-700 border-2 border-green-500' : 'bg-gray-100 text-gray-500 border border-gray-300'
            }`}>
              {i < currentStep ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-0.5 ${i < currentStep ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            )}
          </div>
          <p className="text-xs font-mono text-gray-600 mt-1">{step}</p>
        </div>
      ))}
    </div>
  )
}

export function CreditOffer({ amount, description, terms, cta }) {
  return (
    <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-3">
      <p className="text-xs text-green-700 uppercase font-mono tracking-wider mb-1">You're eligible for</p>
      <p className="text-3xl font-semibold text-green-900 mb-2 letter-spacing-tight">₦{amount}</p>
      <p className="text-xs text-green-800 mb-2 leading-relaxed">{description}</p>
      {terms && (
        <ul className="text-xs text-green-700 space-y-1 mb-3">
          {terms.map((term, i) => <li key={i}>• {term}</li>)}
        </ul>
      )}
      {cta}
    </div>
  )
}

export function NotificationCard({ icon, title, body, cta }) {
  return (
    <div className="bg-green-50 border border-green-300 rounded-lg p-3.5 mb-3">
      <div className="flex items-start gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <p className="font-semibold text-green-900 text-sm">{title}</p>
      </div>
      <p className="text-xs text-green-800 mb-2 leading-relaxed">{body}</p>
      {cta}
    </div>
  )
}
