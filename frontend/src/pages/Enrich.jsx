import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Sparkles, Check, Clock, ChevronRight, Building2, TrendingUp, Tag, FileText } from 'lucide-react'
import { useLeads } from '../store/leads'
import { enrichLead } from '../services/gemini'
import { cn } from '../lib/utils'
import Avatar from '../components/ui/Avatar'
import StatusBadge from '../components/ui/StatusBadge'
import ScoreRing from '../components/ui/ScoreRing'
import { useToast } from '../components/ui/Toast'

const ENRICH_STEPS = [
  { id: 'company', label: 'Company Research', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { id: 'score', label: 'Lead Scoring', icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
  { id: 'tags', label: 'Auto-tagging', icon: Tag, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  { id: 'summary', label: 'AI Summary', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
]

export default function EnrichPage() {
  const { leads, actions } = useLeads()
  const { toast } = useToast()
  const [selected, setSelected] = useState(new Set())
  const [enriching, setEnriching] = useState(false)
  const [results, setResults] = useState({})
  const [currentStep, setCurrentStep] = useState({})

  const unenriched = leads.filter((lead) => !lead.enriched)
  const enriched = leads.filter((lead) => lead.enriched)

  function toggleSelect(id) {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === unenriched.length) setSelected(new Set())
    else setSelected(new Set(unenriched.map((lead) => lead.id)))
  }

  async function handleBulkEnrich() {
    if (!selected.size) return

    setEnriching(true)
    const ids = Array.from(selected)
    setResults(Object.fromEntries(ids.map((id) => [id, { status: 'pending', steps: [] }])))

    for (const id of ids) {
      const lead = leads.find((entry) => entry.id === id)
      if (!lead) continue

      setResults((previous) => ({ ...previous, [id]: { status: 'running', steps: [] } }))

      for (let stepIndex = 0; stepIndex < ENRICH_STEPS.length; stepIndex += 1) {
        setCurrentStep((previous) => ({ ...previous, [id]: stepIndex }))
        await new Promise((resolve) => setTimeout(resolve, 400))
        setResults((previous) => ({
          ...previous,
          [id]: { ...previous[id], steps: [...previous[id].steps, stepIndex] },
        }))
      }

      try {
        const enrichedLead = await enrichLead(lead)
        actions.syncLead(enrichedLead)
        setResults((previous) => ({ ...previous, [id]: { status: 'done', steps: [0, 1, 2, 3] } }))
      } catch (error) {
        setResults((previous) => ({ ...previous, [id]: { status: 'failed', steps: [] } }))
        toast(error.message || `Failed to enrich ${lead.name}`, 'error')
      }
    }

    setEnriching(false)
    setSelected(new Set())
  }

  const doneCount = Object.values(results).filter((result) => result.status === 'done').length
  const totalSelected = selected.size

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">AI Lead Enrichment</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Automatically enrich lead data with company info, scores, tags, and AI summaries</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-sm card-shadow rounded-2xl p-5"
      >
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Enrichment Workflow</h3>
        <div className="flex items-center gap-2">
          {ENRICH_STEPS.map((step, index) => (
            <div key={step.id} className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 flex-col items-center gap-1.5">
                <div className={`rounded-xl border border-slate-200/50 p-2.5 dark:border-slate-700/50 ${step.bg}`}>
                  <step.icon size={16} className={step.color} />
                </div>
                <span className="text-center text-[10px] font-medium leading-tight text-slate-600 dark:text-slate-400">{step.label}</span>
              </div>
              {index < ENRICH_STEPS.length - 1 && <ChevronRight size={14} className="mb-3 shrink-0 text-slate-300 dark:text-slate-700" />}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-sm card-shadow overflow-hidden rounded-2xl lg:col-span-2"
        >
          <div className="flex items-center gap-3 border-b border-slate-200/50 px-5 py-3.5 dark:border-slate-800/50">
            <label className="flex cursor-pointer items-center gap-2">
              <div
                onClick={selectAll}
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded border-2 transition-all',
                  selected.size === unenriched.length && unenriched.length > 0
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-slate-300 hover:border-blue-400 dark:border-slate-600'
                )}
              >
                {selected.size === unenriched.length && unenriched.length > 0 && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-[12px] text-slate-500">
                {selected.size > 0 ? `${selected.size} selected` : `${unenriched.length} unenriched`}
              </span>
            </label>

            <div className="ml-auto">
              {selected.size > 0 && !enriching && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleBulkEnrich}
                  className="rounded-xl bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-blue-700"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="flex items-center gap-1.5">
                    <Zap size={12} />
                    Enrich {selected.size} Leads
                  </span>
                </motion.button>
              )}
            </div>
          </div>

          <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto custom-scroll dark:divide-slate-800/50">
            {unenriched.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
                  <Check size={20} className="text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">All leads enriched!</p>
                <p className="text-xs text-slate-400">Import new leads to enrich them</p>
              </div>
            ) : (
              unenriched.map((lead, index) => {
                const result = results[lead.id]
                const isRunning = result?.status === 'running'
                const isDone = result?.status === 'done'
                const isPending = result?.status === 'pending'
                const stepIndex = currentStep[lead.id] ?? -1

                return (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.3) }}
                    className={cn(
                      'flex items-center gap-3 px-5 py-3 transition-colors',
                      isDone && 'bg-emerald-50/40 dark:bg-emerald-500/5',
                      !enriching && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    )}
                    onClick={() => !enriching && toggleSelect(lead.id)}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all',
                        isDone
                          ? 'border-emerald-500 bg-emerald-500'
                          : selected.has(lead.id)
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-slate-300 dark:border-slate-600'
                      )}
                    >
                      {(selected.has(lead.id) || isDone) && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>

                    <Avatar name={lead.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{lead.name}</span>
                        {isDone && <Sparkles size={10} className="text-emerald-500" />}
                      </div>
                      <div className="truncate text-[11px] text-slate-400">{lead.title} - {lead.company}</div>

                      {(isRunning || isPending) && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {ENRICH_STEPS.map((step, innerIndex) => (
                            <div key={step.id} className="flex items-center gap-1">
                              <div
                                className={cn(
                                  'h-1.5 w-1.5 rounded-full transition-all',
                                  result?.steps?.includes(innerIndex)
                                    ? 'bg-blue-500'
                                    : innerIndex === stepIndex
                                      ? 'animate-pulse bg-blue-300'
                                      : 'bg-slate-200 dark:bg-slate-700'
                                )}
                              />
                            </div>
                          ))}
                          <span className="ml-1 text-[10px] text-slate-400">
                            {isRunning ? ENRICH_STEPS[stepIndex]?.label || 'Processing...' : 'Queued...'}
                          </span>
                        </div>
                      )}
                    </div>

                    <StatusBadge status={lead.status} />
                    <div className="shrink-0">
                      {isDone ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                          <Check size={12} className="text-white" strokeWidth={3} />
                        </motion.div>
                      ) : isRunning ? (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      ) : isPending ? (
                        <Clock size={14} className="text-amber-400" />
                      ) : null}
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </motion.div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-sm card-shadow rounded-2xl p-5"
          >
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Enrichment Stats</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Leads', value: leads.length, color: 'bg-slate-200 dark:bg-slate-700' },
                { label: 'Enriched', value: enriched.length, color: 'bg-emerald-500', pct: leads.length ? (enriched.length / leads.length) * 100 : 0 },
                { label: 'Pending', value: unenriched.length, color: 'bg-amber-400', pct: leads.length ? (unenriched.length / leads.length) * 100 : 0 },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="text-slate-500">{stat.label}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{stat.value}</span>
                  </div>
                  {stat.pct !== undefined && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        className={`h-full rounded-full ${stat.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.pct}%` }}
                        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {enriching && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 border-t border-slate-200/50 pt-4 dark:border-slate-800/50">
                <div className="mb-2 flex items-center gap-2">
                  <div className="pulse-glow h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400">AI Enriching...</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{doneCount}</span>
                  <div className="h-1 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                    <motion.div
                      className="h-full rounded-full bg-blue-500"
                      animate={{ width: `${totalSelected ? (doneCount / totalSelected) * 100 : 0}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span>{totalSelected}</span>
                </div>
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-sm card-shadow overflow-hidden rounded-2xl"
          >
            <div className="flex items-center gap-2 border-b border-slate-200/50 px-5 py-3 dark:border-slate-800/50">
              <Sparkles size={13} className="text-blue-500" />
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Recently Enriched</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {enriched.slice(0, 5).map((lead, index) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="flex items-center gap-2.5 px-4 py-2.5"
                >
                  <Avatar name={lead.name} size="xs" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold text-slate-700 dark:text-slate-300">{lead.name}</div>
                    <div className="truncate text-[10px] text-slate-400">{lead.company}</div>
                  </div>
                  <ScoreRing score={lead.score} size={28} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
