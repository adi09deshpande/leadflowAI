import { motion } from 'framer-motion'
import { cn, SCORE_COLOR } from '../../lib/utils'

export default function ScoreRing({ score, size = 40, pending = false, pendingLabel = 'Not enriched' }) {
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, score || 0))
  const dash = (pct / 100) * circumference

  if (pending) {
    return (
      <div
        className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
      >
        {pendingLabel}
      </div>
    )
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          className="text-slate-200 dark:text-slate-800"
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={pct >= 85 ? '#10b981' : pct >= 70 ? '#3b82f6' : pct >= 50 ? '#f59e0b' : '#ef4444'} />
            <stop offset="100%" stopColor={pct >= 85 ? '#34d399' : pct >= 70 ? '#60a5fa' : pct >= 50 ? '#fbbf24' : '#f87171'} />
          </linearGradient>
        </defs>
      </svg>
      <div className={cn(
        'absolute inset-0 flex items-center justify-center text-[10px] font-bold',
        SCORE_COLOR(pct)
      )}>
        {pct}
      </div>
    </div>
  )
}
