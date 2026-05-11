import { motion } from 'framer-motion'
import { cn, SCORE_COLOR } from '../../lib/utils'

export default function ScoreRing({ score, size = 40 }) {
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, score || 0))
  const dash = (pct / 100) * circumference

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
