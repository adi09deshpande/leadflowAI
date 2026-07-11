import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { useToast } from '../components/ui/Toast'
import { cn } from '../lib/utils'

const CATEGORIES = ['general', 'saas', 'agency', 'recruiting', 'partnership']

const DEFAULT_FORM = {
  name: '',
  category: 'general',
  description: '',
  subject_guidance: '',
  body_guidance: '',
  tone: 'professional',
  tags: '',
}

export default function TemplatesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [category, setCategory] = useState('all')
  const [form, setForm] = useState(DEFAULT_FORM)

  const filteredTemplates = useMemo(() => {
    if (category === 'all') return templates
    return templates.filter((template) => template.category === category)
  }, [category, templates])

  useEffect(() => {
    let cancelled = false
    async function loadTemplates() {
      setLoading(true)
      try {
        const result = await api.getTemplates()
        if (!cancelled) setTemplates(result || [])
      } catch (error) {
        if (!cancelled) toast(error.message || 'Failed to load templates', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadTemplates()
    return () => {
      cancelled = true
    }
  }, [toast])

  async function handleCreate(event) {
    event.preventDefault()
    if (!form.name.trim() || !form.body_guidance.trim() || saving) return

    setSaving(true)
    try {
      const created = await api.createTemplate({
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || null,
        subject_guidance: form.subject_guidance.trim() || null,
        body_guidance: form.body_guidance.trim(),
        tone: form.tone.trim() || 'professional',
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      })
      setTemplates((current) => [created, ...current])
      setForm(DEFAULT_FORM)
      toast('Template saved', 'success')
    } catch (error) {
      toast(error.message || 'Failed to save template', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(template) {
    try {
      await api.deleteTemplate(template.id)
      setTemplates((current) => current.filter((item) => item.id !== template.id))
      toast('Template deleted', 'success')
    } catch (error) {
      toast(error.message || 'Failed to delete template', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">Email Templates</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Save reusable outreach angles for different lead types and apply them in the Email page.</p>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <form onSubmit={handleCreate} className="glass-sm card-shadow rounded-2xl p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Plus size={15} className="text-blue-500" />
            New Template
          </h2>

          <div className="space-y-3">
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Template name"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <input
                value={form.tone}
                onChange={(event) => setForm({ ...form, tone: event.target.value })}
                placeholder="Tone"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              />
            </div>

            <input
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Short description"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            />

            <input
              value={form.subject_guidance}
              onChange={(event) => setForm({ ...form, subject_guidance: event.target.value })}
              placeholder="Subject guidance"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            />

            <textarea
              value={form.body_guidance}
              onChange={(event) => setForm({ ...form, body_guidance: event.target.value })}
              placeholder="Body guidance"
              className="h-32 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            />

            <input
              value={form.tags}
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
              placeholder="Tags, comma separated"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            />

            <button
              type="submit"
              disabled={saving || !form.name.trim() || !form.body_guidance.trim()}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>

        <div className="glass-sm card-shadow rounded-2xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Template Library</h2>
            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {['all', ...CATEGORIES].map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={cn(
                    'rounded-lg px-3 py-1 text-[11px] font-semibold capitalize transition-colors',
                    category === item
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
            <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={30} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No templates in this category</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{template.name}</h3>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                          {template.category}
                        </span>
                      </div>
                      {template.description && (
                        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{template.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(template)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {template.subject_guidance && (
                    <p className="mt-3 text-[12px] text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Subject:</span> {template.subject_guidance}
                    </p>
                  )}
                  <p className="mt-2 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Body:</span> {template.body_guidance}
                  </p>
                  {template.tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {template.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
