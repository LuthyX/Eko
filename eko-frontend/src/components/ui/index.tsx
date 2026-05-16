import { forwardRef, type InputHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

// ── Button ────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'amber' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary', size, loading, fullWidth = true,
  className, children, disabled, ...props
}, ref) => {
  const variantMap = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    amber: 'btn-amber',
    ghost: 'btn-ghost',
    danger: 'bg-red-500 text-white w-full py-3.5 px-6',
  }
  return (
    <button
      ref={ref}
      className={cn('btn', variantMap[variant], size === 'sm' && 'btn-sm', className)}
      disabled={disabled || loading}
      style={fullWidth ? { width: '100%' } : undefined}
      {...props}
    >
      {loading ? <Spinner size={16} color="currentColor" /> : children}
    </button>
  )
})
Button.displayName = 'Button'

// ── Input ─────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, leftIcon, rightIcon, className, ...props
}, ref) => (
  <div className="input-group">
    {label && <label className="input-label">{label}</label>}
    <div style={{ position: 'relative' }}>
      {leftIcon && (
        <div style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--t3)', display: 'flex',
        }}>{leftIcon}</div>
      )}
      <input
        ref={ref}
        className={cn('input', leftIcon && 'pl-10', rightIcon && 'pr-10', className)}
        style={{
          paddingLeft: leftIcon ? 40 : undefined,
          paddingRight: rightIcon ? 40 : undefined,
          borderColor: error ? 'var(--r)' : undefined,
        }}
        {...props}
      />
      {rightIcon && (
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--t3)', display: 'flex',
        }}>{rightIcon}</div>
      )}
    </div>
    {error && <p style={{ fontSize: 12, color: 'var(--r)', marginTop: 2 }}>{error}</p>}
  </div>
))
Input.displayName = 'Input'

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 20, color = 'var(--g)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.7s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, className, onClick, style }: {
  children: ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties
}) {
  return (
    <div className={cn('card', onClick && 'cursor-pointer', className)} onClick={onClick} style={style}>
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ children, variant = 'gray' }: {
  children: ReactNode
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'gray'
}) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}

// ── Bottom Sheet ──────────────────────────────────────────────
export function BottomSheet({ open, onClose, children, title }: {
  open: boolean; onClose: () => void; children: ReactNode; title?: string
}) {
  if (!open) return null
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {title && (
          <div className="sheet-header">
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h3>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px', width: 'auto' }}>
              <X size={20} />
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

export function ToastContainer({ toasts, onRemove }: {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={cn('toast animate-fade-in-up', `toast-${t.type}`)}>
          {t.type === 'success' && <CheckCircle size={18} />}
          {t.type === 'error' && <AlertCircle size={18} />}
          {t.type === 'info' && <Info size={18} />}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────
export function PageHeader({ title, subtitle, right, back }: {
  title: string; subtitle?: string; right?: ReactNode; back?: () => void
}) {
  return (
    <div className="page-header" style={{ paddingTop: 20, paddingBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        {back && (
          <button onClick={back} className="btn btn-ghost btn-sm" style={{ padding: '8px', width: 'auto', borderRadius: '50%' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        )}
        <div>
          <h1 style={{ fontSize: 24 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────
export function Avatar({ name, size = 40, green }: { name: string; size?: number; green?: boolean }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: green ? 'var(--g)' : 'var(--s2)',
      color: green ? '#fff' : 'var(--t1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
      letterSpacing: '-0.02em',
    }}>
      {initials}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = 'var(--g)', height = 6 }: {
  value: number; max?: number; color?: string; height?: number
}) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{ background: 'var(--s2)', borderRadius: 999, height, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', background: color,
        borderRadius: 999, transition: 'width 0.6s var(--ease)',
      }} />
    </div>
  )
}

// ── Stat tile ─────────────────────────────────────────────────
export function StatTile({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div style={{
      background: 'var(--s0)', borderRadius: 'var(--r-md)',
      padding: '14px 16px', border: '1px solid var(--bd)', flex: 1,
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: color || 'var(--t0)' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: ReactNode; title: string; description?: string; action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {action}
    </div>
  )
}

// ── Skill tag ─────────────────────────────────────────────────
export function SkillTag({ skill }: { skill: string }) {
  return (
    <span style={{
      background: 'var(--s1)', color: 'var(--t1)',
      fontSize: 12, fontWeight: 500,
      padding: '4px 10px', borderRadius: 6,
      border: '1px solid var(--bd)',
      display: 'inline-block',
    }}>
      {skill}
    </span>
  )
}
