import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Zap, Mail, Trash2,
  LayoutGrid, List, Sparkles, Pencil,
  Phone, MapPin, Globe, Link2, X, Users,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLeads } from '../store/leads'
import { cn, STATUS_CONFIG, timeAgo } from '../lib/utils'
import Avatar from '../components/ui/Avatar'
import StatusBadge from '../components/ui/StatusBadge'
import ScoreRing from '../components/ui/ScoreRing'
import AddLeadModal from '../components/leads/AddLeadModal'
import KanbanBoard from '../components/leads/KanbanBoard'
import { enrichLead } from '../services/gemini'
import { useToast } from '../components/ui/Toast'

const STATUSES = ['all', 'new', 'contacted', 'qualified', 'proposal', 'closed_won', 'closed_lost']
const SORTS = [
  { value: 'score', label: 'Score' },
  { value: 'date', label: 'Date' },
  { value: 'name', label: 'Name' },
]

export default function LeadsPage() {
  const { filtered, filter, selected, actions, loading } = useLeads()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [enriching, setEnriching] = useState(null)
  const [viewMode, setViewMode] = useState('table')

  useEffect(() => {
    if (location.state?.openAddLead) {
      const timer = setTimeout(() => {
        setShowAdd(true)
        navigate(location.pathname, { replace: true, state: {} })
      }, 0)

      return () => clearTimeout(timer)
    }
  }, [location.pathname, location.state, navigate])

  async function handleEnrich(lead, event) {
    event?.stopPropagation()
    setEnriching(lead.id)
    try {
      const enrichedLead = await enrichLead(lead)
      actions.syncLead(enrichedLead)
      toast(`Enriched ${lead.name}`, 'ai')
    } catch (error) {
      toast(error.message || 'Failed to enrich lead', 'error')
    } finally {
      setEnriching(null)
    }
  }

  return (
    <div className="flex h-full">
      <div className={cn('flex min-w-0 flex-1 flex-col transition-all duration-300', selected ? 'lg:max-w-[60%]' : '')}>
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800/50 dark:bg-slate-900/40">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={filter.search}
              onChange={(event) => actions.setFilter({ search: event.target.value })}
              className="w-full rounded-xl bg-slate-100/80 py-2 pl-8 pr-3 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/40 dark:bg-slate-800/60 dark:text-slate-300"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {STATUSES.slice(0, 5).map((status) => (
              <button
                key={status}
                onClick={() => actions.setFilter({ status })}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-all',
                  filter.status === status
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                )}
              >
                {status === 'all' ? 'All' : STATUS_CONFIG[status]?.label || status}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={filter.sortBy}
              onChange={(event) => actions.setFilter({ sortBy: event.target.value })}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {SORTS.map((sort) => (
                <option key={sort.value} value={sort.value}>{sort.label}</option>
              ))}
            </select>

            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
              {[{ id: 'table', icon: List }, { id: 'kanban', icon: LayoutGrid }].map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setViewMode(id)}
                  className={cn(
                    'rounded-lg p-1.5 transition-all',
                    viewMode === id
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>

            <motion.button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-blue-700"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={13} />
              Add Lead
            </motion.button>
          </div>
        </div>

        <div className="px-6 py-2.5 text-[12px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span> leads
          {filter.search && <span> matching <em>"{filter.search}"</em></span>}
        </div>

        {viewMode === 'kanban' ? (
          <div className="flex-1 overflow-hidden">
            <KanbanBoard />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scroll">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm dark:bg-slate-900/90">
                <tr className="border-b border-slate-200/50 dark:border-slate-800/50">
                  {['Lead', 'Company', 'Status', 'Score', 'Source', 'Added', 'Actions'].map((heading) => (
                    <th key={heading} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((lead, index) => (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      onClick={() => actions.selectLead(selected?.id === lead.id ? null : lead)}
                      className={cn(
                        'group cursor-pointer border-b border-slate-100 transition-colors dark:border-slate-800/50',
                        selected?.id === lead.id
                          ? 'bg-blue-50/70 dark:bg-blue-500/5'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={lead.name} size="sm" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{lead.name}</span>
                              {lead.enriched && <Sparkles size={10} className="text-blue-400" />}
                            </div>
                            <div className="max-w-[140px] truncate text-[11px] text-slate-400">{lead.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[13px] text-slate-700 dark:text-slate-300">{lead.company}</div>
                        <div className="text-[11px] text-slate-400">{lead.title}</div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                      <td className="px-4 py-3">
                        <ScoreRing
                          score={lead.score}
                          size={34}
                          pending={!lead.enriched}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {lead.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-400">{timeAgo(lead.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              setEditingLead(lead)
                            }}
                            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={(event) => handleEnrich(lead, event)}
                            disabled={enriching === lead.id}
                            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:text-slate-400 dark:hover:bg-blue-500/10"
                            title="AI Enrich"
                          >
                            {enriching === lead.id
                              ? <div className="h-3 w-3 animate-spin rounded-full border border-blue-500 border-t-transparent" />
                              : <Zap size={13} />}
                          </button>
                          <button
                            onClick={async (event) => {
                              event.stopPropagation()
                              await actions.deleteLead(lead.id)
                            }}
                            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-slate-400 dark:hover:bg-red-500/10"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <Users size={24} className="text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">No leads found</p>
                <p className="mt-1 text-xs text-slate-400">Import or create a lead to get started</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: 40, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 380 }}
            exit={{ opacity: 0, x: 40, width: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="hidden min-w-0 flex-col overflow-hidden border-l border-slate-200/50 bg-white/70 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/70 lg:flex"
          >
            <LeadDetail
              lead={selected}
              onClose={() => actions.selectLead(null)}
              onEnrich={handleEnrich}
              onWriteEmail={(lead) => navigate(`/email?lead=${lead.id}`)}
              enriching={enriching}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdd && <AddLeadModal key="new-lead" onClose={() => setShowAdd(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {editingLead && <AddLeadModal key={editingLead.id} lead={editingLead} onClose={() => setEditingLead(null)} />}
      </AnimatePresence>
    </div>
  )
}

function LeadDetail({ lead, onClose, onEnrich, onWriteEmail, enriching }) {
  const { actions } = useLeads()
  const { toast } = useToast()
  const [status, setStatus] = useState(lead.status)
  const [tab, setTab] = useState('overview')
  const [notes, setNotes] = useState(lead.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)

  async function handleStatusChange(nextStatus) {
    setStatus(nextStatus)
    await actions.updateLead({ ...lead, status: nextStatus })
  }

  async function handleSaveNotes() {
    if (savingNotes) return

    setSavingNotes(true)
    try {
      await actions.updateLead({ id: lead.id, notes })
      toast(`Saved notes for ${lead.name}`, 'success')
    } catch (error) {
      toast(error.message || 'Failed to save notes', 'error')
    } finally {
      setSavingNotes(false)
    }
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      <div className="border-b border-slate-200/50 p-5 dark:border-slate-800/50">
        <div className="mb-4 flex items-start justify-between">
          <Avatar name={lead.name} size="lg" />
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={15} />
          </button>
        </div>
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-200">
          {lead.name}
          {lead.enriched && <Sparkles size={12} className="text-blue-400" />}
        </h2>
        <p className="mt-0.5 text-[13px] text-slate-500">{lead.title} - {lead.company}</p>
        <div className="mt-3 flex items-center gap-2">
          <ScoreRing
            score={lead.score}
            size={36}
            pending={!lead.enriched}
          />
          <select
            value={status}
            onChange={(event) => handleStatusChange(event.target.value)}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[12px] text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {Object.entries(STATUS_CONFIG).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200/50 px-5 py-2 dark:border-slate-800/50">
        {['overview', 'notes'].map((nextTab) => (
          <button
            key={nextTab}
            onClick={() => setTab(nextTab)}
            className={cn(
              'rounded-lg px-3 py-1 text-[11px] font-medium capitalize transition-colors',
              tab === nextTab
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {nextTab}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5 custom-scroll">
        {tab === 'overview' && (
          <>
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Contact</h4>
              {[
                { icon: Mail, value: lead.email, href: `mailto:${lead.email}` },
                { icon: Phone, value: lead.phone },
                { icon: MapPin, value: lead.location },
                { icon: Globe, value: lead.website, href: lead.website ? `https://${lead.website}` : null },
                { icon: Link2, value: lead.linkedin, href: lead.linkedin ? `https://${lead.linkedin}` : null },
              ]
                .filter((item) => item.value)
                .map((item, index) => (
                  <div key={index} className="flex items-center gap-2.5 text-[12px]">
                    <item.icon size={13} className="shrink-0 text-slate-400" />
                    {item.href ? (
                      <a href={item.href} target="_blank" rel="noopener" className="truncate text-blue-500 hover:underline">
                        {item.value}
                      </a>
                    ) : (
                      <span className="truncate text-slate-600 dark:text-slate-400">{item.value}</span>
                    )}
                  </div>
                ))}
            </div>

            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Company</h4>
              {[
                { label: 'Industry', value: lead.industry },
                { label: 'Size', value: lead.company_size },
                { label: 'Revenue', value: lead.revenue },
                { label: 'Source', value: lead.source },
              ]
                .filter((item) => item.value)
                .map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.value}</span>
                  </div>
                ))}
            </div>

            {lead.tags?.length > 0 && (
              <div>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {lead.summary && (
              <div className="rounded-xl border border-blue-200/40 bg-blue-50/60 p-3.5 dark:border-blue-500/20 dark:bg-blue-500/10">
                <div className="mb-2 flex items-center gap-1.5">
                  <Sparkles size={11} className="text-blue-500" />
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">AI Summary</span>
                </div>
                <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">{lead.summary}</p>
              </div>
            )}
          </>
        )}

        {tab === 'notes' && (
          <div className="space-y-3">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="h-48 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              placeholder="Add notes about this lead..."
            />
            <div className="flex justify-end">
              <motion.button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="rounded-xl bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
                whileHover={!savingNotes ? { scale: 1.02 } : {}}
                whileTap={!savingNotes ? { scale: 0.98 } : {}}
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </motion.button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-slate-200/50 p-4 dark:border-slate-800/50">
        <motion.button
          onClick={() => onEnrich(lead)}
          disabled={enriching === lead.id}
          className="flex-1 rounded-xl bg-blue-50 py-2 text-[12px] font-semibold text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="flex items-center justify-center gap-1.5">
            {enriching === lead.id
              ? <div className="h-3 w-3 animate-spin rounded-full border border-blue-500 border-t-transparent" />
              : <Zap size={13} />}
            {lead.enriched ? 'Re-enrich' : 'AI Enrich'}
          </span>
        </motion.button>
        <motion.button
          onClick={() => onWriteEmail(lead)}
          className="flex-1 rounded-xl bg-violet-50 py-2 text-[12px] font-semibold text-violet-600 transition-colors hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Mail size={13} />
            Write Email
          </span>
        </motion.button>
      </div>
    </div>
  )
}
