import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatNaira(amount: number, compact = false): string {
  if (compact && amount >= 1_000_000) {
    return `₦${(amount / 1_000_000).toFixed(1)}M`
  }
  if (compact && amount >= 1_000) {
    return `₦${(amount / 1_000).toFixed(0)}K`
  }
  return `₦${amount.toLocaleString('en-NG')}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'Just now'
}

export function getScoreColor(score: number): string {
  if (score >= 70) return '#00C896'
  if (score >= 60) return '#F5A623'
  return '#EF4444'
}

export function getRiskTierColor(tier: string): string {
  if (tier === 'A') return '#00C896'
  if (tier === 'B') return '#F5A623'
  if (tier === 'C') return '#EF4444'
  return '#AEAEA6'
}

export function getMatchScoreColor(score: number): string {
  if (score >= 80) return '#00C896'
  if (score >= 60) return '#F5A623'
  return '#EF4444'
}

export function slugifySkill(skill: string): string {
  return skill.toLowerCase().replace(/\s+/g, '-')
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
