import { cn } from '../../lib/utils'

const CHART_BAR_HEIGHTS = [42, 68, 54, 77, 61, 83, 58, 71, 49, 64, 57, 74]

export function Skeleton({ className }) {
  return (
    <div className={cn('shimmer rounded-lg', className)} />
  )
}

export function LeadRowSkeleton() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-36" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
      <td className="px-4 py-3"><Skeleton className="w-8 h-8 rounded-full" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
      <td className="px-4 py-3"><Skeleton className="h-3 w-14" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-10" /></td>
    </tr>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="glass-sm card-shadow rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="w-8 h-8 rounded-xl" />
        <Skeleton className="w-6 h-4" />
      </div>
      <Skeleton className="h-7 w-16 mb-1.5" />
      <Skeleton className="h-3 w-20 mb-1" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

export function ChartSkeleton({ height = 180 }) {
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1" style={{ height }}>
        {CHART_BAR_HEIGHTS.map((barHeight, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${barHeight}%` }}
          />
        ))}
      </div>
      <div className="flex gap-6 justify-around">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 w-8" />
        ))}
      </div>
    </div>
  )
}
