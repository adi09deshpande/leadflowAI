import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'
import Avatar from '../ui/Avatar'
import ScoreRing from '../ui/ScoreRing'
import { useLeads } from '../../store/leads'

const COLUMNS = [
  { id: 'new', label: 'New', color: 'border-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', dot: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'border-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', dot: 'bg-amber-500' },
  { id: 'qualified', label: 'Qualified', color: 'border-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10', dot: 'bg-violet-500' },
  { id: 'proposal', label: 'Proposal', color: 'border-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10', dot: 'bg-orange-500' },
  { id: 'closed_won', label: 'Won', color: 'border-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', dot: 'bg-emerald-500' },
]

export default function KanbanBoard() {
  const { leads, actions } = useLeads()
  const [dragging, setDragging] = useState(null)

  function onDrop(colId, event) {
    event.preventDefault()
    if (dragging && dragging !== colId) {
      actions.updateLead({ id: dragging, status: colId })
    }
    setDragging(null)
  }

  return (
    <div className="h-full overflow-y-auto p-4 custom-scroll">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {COLUMNS.map((col) => {
        const colLeads = leads.filter((lead) => lead.status === col.id)
        return (
          <KanbanColumn
            key={col.id}
            col={col}
            leads={colLeads}
            onDrop={onDrop}
            setDragging={setDragging}
            onStatusChange={(id, status) => actions.updateLead({ id, status })}
          />
        )
      })}
      </div>
    </div>
  )
}

function KanbanColumn({ col, leads, onDrop, setDragging, onStatusChange }) {
  const [over, setOver] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'min-w-0 rounded-2xl border-t-2 bg-white/90 card-shadow transition-all duration-200 dark:bg-slate-900/60',
        col.color,
        over && 'bg-blue-50/40 dark:bg-blue-500/5'
      )}
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false)
        onDrop(col.id, event)
      }}
    >
      <div className={cn('flex items-center rounded-t-xl px-3 py-3', col.bg)}>
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', col.dot)} />
          <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{col.label}</span>
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {leads.length}
          </span>
        </div>
      </div>

      <div className="flex max-h-[26rem] min-h-[10rem] flex-1 flex-col gap-2 overflow-y-auto p-2 custom-scroll">
        <AnimatePresence>
          {leads.map((lead, index) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              index={index}
              colId={col.id}
              setDragging={setDragging}
              onStatusChange={onStatusChange}
            />
          ))}
        </AnimatePresence>

        {leads.length === 0 && (
          <div className="flex items-center justify-center py-8 text-xs text-slate-500 dark:text-slate-500">
            {col.id === 'new' ? 'No new leads yet' : `No ${col.label.toLowerCase()} leads yet`}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function KanbanCard({ lead, index, colId, setDragging, onStatusChange }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 280, damping: 28 }}
      draggable
      onDragStart={() => setDragging(lead.id)}
      onDragEnd={() => setDragging(null)}
      className="group relative cursor-grab rounded-xl border border-slate-100 bg-white p-3 card-shadow transition-shadow hover:shadow-md active:cursor-grabbing dark:border-slate-700/50 dark:bg-slate-800"
    >
      <div className="absolute right-2.5 top-2.5">
        <ScoreRing score={lead.score} size={28} />
      </div>

      <div className="mb-2 flex items-center gap-2 pr-8">
        <Avatar name={lead.name} size="xs" />
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="truncate text-[12px] font-bold text-slate-800 dark:text-slate-200">{lead.name}</span>
            {lead.enriched && <Sparkles size={9} className="shrink-0 text-blue-400" />}
          </div>
          <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">{lead.title}</div>
        </div>
      </div>

      <div className="mb-2 truncate rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-700/50 dark:text-slate-400">
        {lead.company}
      </div>

      {lead.tags?.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {lead.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 dark:text-slate-400">{lead.source}</span>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {COLUMNS.filter((column) => column.id !== colId)
            .slice(0, 2)
            .map((column) => (
              <button
                key={column.id}
                onClick={() => onStatusChange(lead.id, column.id)}
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 transition-colors hover:opacity-80 dark:text-slate-300',
                  column.bg
                )}
                title={`Move to ${column.label}`}
              >
                {'->'} {column.label}
              </button>
            ))}
        </div>
      </div>
    </motion.div>
  )
}
