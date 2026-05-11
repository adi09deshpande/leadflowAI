import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-500' },
  contacted: { label: 'Contacted', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500' },
  qualified: { label: 'Qualified', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', dot: 'bg-violet-500' },
  proposal: { label: 'Proposal', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', dot: 'bg-orange-500' },
  closed_won: { label: 'Won', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  closed_lost: { label: 'Lost', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', dot: 'bg-red-400' },
}

export const SCORE_COLOR = (score) => {
  if (score >= 85) return 'text-emerald-500'
  if (score >= 70) return 'text-blue-500'
  if (score >= 50) return 'text-amber-500'
  return 'text-red-400'
}

export const SCORE_BG = (score) => {
  if (score >= 85) return 'from-emerald-500 to-green-400'
  if (score >= 70) return 'from-blue-500 to-cyan-400'
  if (score >= 50) return 'from-amber-500 to-yellow-400'
  return 'from-red-500 to-orange-400'
}

export function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr)
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export const AVATAR_COLORS = [
  'from-blue-500 to-violet-500',
  'from-emerald-500 to-cyan-500',
  'from-orange-500 to-pink-500',
  'from-violet-500 to-pink-500',
  'from-cyan-500 to-blue-500',
  'from-pink-500 to-red-500',
]

export function getAvatarColor(name) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}
