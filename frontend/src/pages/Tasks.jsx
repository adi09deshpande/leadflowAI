import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarClock, Check, Clock, Phone, Plus, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { useLeads } from '../store/leads'
import { useToast } from '../components/ui/Toast'
import { cn } from '../lib/utils'

const TASK_TYPES = [
  { value: 'follow_up', label: 'Follow up' },
  { value: 'call', label: 'Call' },
  { value: 'research', label: 'Research' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'other', label: 'Other' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

function toDatetimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function toIsoDateTime(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function formatDueDate(value) {
  if (!value) return 'No due date'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function isOverdue(task) {
  return Boolean(task.due_at && !task.completed && new Date(task.due_at) < new Date())
}

export default function TasksPage() {
  const { leads } = useLeads()
  const { toast } = useToast()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('open')
  const [form, setForm] = useState({
    lead_id: leads[0]?.id || '',
    title: '',
    due_at: '',
    task_type: 'follow_up',
    priority: 'medium',
    notes: '',
  })

  const leadMap = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads])
  const visibleTasks = tasks.filter((task) => {
    if (filter === 'open') return !task.completed
    if (filter === 'done') return task.completed
    return true
  })

  useEffect(() => {
    if (!form.lead_id && leads[0]?.id) {
      setForm((current) => ({ ...current, lead_id: leads[0].id }))
    }
  }, [form.lead_id, leads])

  useEffect(() => {
    let cancelled = false
    async function loadTasks() {
      setLoading(true)
      try {
        const result = await api.getTasks()
        if (!cancelled) setTasks(result || [])
      } catch (error) {
        if (!cancelled) toast(error.message || 'Failed to load tasks', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadTasks()
    return () => {
      cancelled = true
    }
  }, [toast])

  async function handleCreateTask(event) {
    event.preventDefault()
    if (!form.lead_id || !form.title.trim() || saving) return

    setSaving(true)
    try {
      const created = await api.createTask({
        ...form,
        title: form.title.trim(),
        notes: form.notes.trim() || null,
        due_at: toIsoDateTime(form.due_at),
      })
      setTasks((current) => [created, ...current])
      setForm((current) => ({ ...current, title: '', due_at: '', notes: '' }))
      toast('Task reminder created', 'success')
    } catch (error) {
      toast(error.message || 'Failed to create task', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleTask(task) {
    try {
      const updated = await api.updateTask(task.id, { completed: !task.completed })
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...updated } : item))
    } catch (error) {
      toast(error.message || 'Failed to update task', 'error')
    }
  }

  async function deleteTask(task) {
    try {
      await api.deleteTask(task.id)
      setTasks((current) => current.filter((item) => item.id !== task.id))
      toast('Task deleted', 'success')
    } catch (error) {
      toast(error.message || 'Failed to delete task', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">Tasks & Reminders</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Track human follow-ups like calls, research, proposals, and meeting prep.</p>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <form onSubmit={handleCreateTask} className="glass-sm card-shadow rounded-2xl p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Plus size={15} className="text-blue-500" />
            New Reminder
          </h2>

          <div className="space-y-3">
            <select
              value={form.lead_id}
              onChange={(event) => setForm({ ...form, lead_id: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>{lead.name} - {lead.company}</option>
              ))}
            </select>

            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Task title"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.task_type}
                onChange={(event) => setForm({ ...form, task_type: event.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {TASK_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
            </div>

            <input
              type="datetime-local"
              value={form.due_at}
              onChange={(event) => setForm({ ...form, due_at: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            />

            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Optional notes"
              className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            />

            <button
              type="submit"
              disabled={saving || !form.lead_id || !form.title.trim()}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Create Reminder'}
            </button>
          </div>
        </form>

        <div className="glass-sm card-shadow rounded-2xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Task Queue</h2>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {['open', 'all', 'done'].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={cn(
                    'rounded-lg px-3 py-1 text-[11px] font-semibold capitalize transition-colors',
                    filter === item
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">Loading tasks...</div>
          ) : visibleTasks.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarClock size={30} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No tasks in this view</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleTasks.map((task) => {
                const lead = leadMap.get(task.lead_id)
                return (
                  <div
                    key={task.id}
                    className={cn(
                      'rounded-2xl border p-4 transition-colors',
                      task.completed
                        ? 'border-slate-200 bg-slate-50 opacity-75 dark:border-slate-700 dark:bg-slate-800/40'
                        : isOverdue(task)
                          ? 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10'
                          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTask(task)}
                        className={cn(
                          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                          task.completed
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-600'
                        )}
                      >
                        {task.completed && <Check size={13} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={cn('text-sm font-semibold text-slate-800 dark:text-slate-200', task.completed && 'line-through')}>
                            {task.title}
                          </h3>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                            {task.task_type?.replace('_', ' ')}
                          </span>
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                            task.priority === 'high'
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                              : task.priority === 'low'
                                ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                          )}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-slate-500 dark:text-slate-400">
                          <span>{lead ? `${lead.name} - ${lead.company}` : task.lead_id}</span>
                          <span className={cn('inline-flex items-center gap-1', isOverdue(task) && 'font-semibold text-amber-700 dark:text-amber-300')}>
                            {task.task_type === 'call' ? <Phone size={11} /> : <Clock size={11} />}
                            {formatDueDate(task.due_at)}
                          </span>
                        </div>
                        {task.notes && (
                          <p className="mt-2 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">{task.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteTask(task)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
