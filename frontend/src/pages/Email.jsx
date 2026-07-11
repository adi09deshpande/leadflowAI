import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Sparkles, Copy, Check, RefreshCw, Send, ChevronDown, User, AlertTriangle, Zap, CalendarClock, Clock } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useLeads } from '../store/leads'
import { enrichLead, generateColdEmailSequence, getSavedEmailSequence, sendGeneratedEmail } from '../services/gemini'
import { api } from '../services/api'
import { cn } from '../lib/utils'
import Avatar from '../components/ui/Avatar'
import { useToast } from '../components/ui/Toast'

const SEQUENCE_STEPS = [
  { step: 1, label: 'Intro' },
  { step: 2, label: 'Follow-up' },
  { step: 3, label: 'Value proof' },
  { step: 4, label: 'Breakup' },
]

const EMAIL_STATUSES = [
  { field: 'sent', label: 'Sent', icon: Send, activeClass: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300' },
  { field: 'delivered', label: 'Delivered', icon: Check, activeClass: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300' },
]

const CADENCE_OFFSETS = {
  1: 0,
  2: 2,
  3: 5,
  4: 9,
}

function hasCompleteSequence(emails) {
  const steps = new Set((emails || []).map((email) => Number(email.sequence_step || 1)))
  return SEQUENCE_STEPS.every((step) => steps.has(step.step))
}

function getVisibleStatuses(email) {
  return EMAIL_STATUSES.filter((status) => Boolean(email?.[status.field]))
}

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

function formatSchedule(value) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function isDue(email) {
  return Boolean(email?.scheduled_at && !email.sent && new Date(email.scheduled_at) <= new Date())
}

export default function EmailPage() {
  const { leads, actions } = useLeads()
  const location = useLocation()
  const { toast } = useToast()
  const queryLeadId = new URLSearchParams(location.search).get('lead')
  const [selectedLeadId, setSelectedLeadId] = useState(() => queryLeadId || null)
  const [sequence, setSequence] = useState([])
  const [activeStep, setActiveStep] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleValue, setScheduleValue] = useState('')
  const [sequenceStartDate, setSequenceStartDate] = useState(() => toDatetimeLocal(new Date().toISOString()))
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [enrichingLead, setEnrichingLead] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showLeadPicker, setShowLeadPicker] = useState(false)
  const [search, setSearch] = useState('')
  const activeLeadId = selectedLeadId && leads.some((lead) => lead.id === selectedLeadId)
    ? selectedLeadId
    : queryLeadId && leads.some((lead) => lead.id === queryLeadId)
      ? queryLeadId
    : leads[0]?.id ?? null
  const activeLead = leads.find((lead) => lead.id === activeLeadId) || null
  const email = sequence.find((item) => Number(item.sequence_step || 1) === activeStep) || null
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || null

  useEffect(() => {
    setScheduleValue(toDatetimeLocal(email?.scheduled_at))
  }, [email?.id, email?.scheduled_at])

  function syncEmail(updatedEmail) {
    setSequence((current) => {
      const step = Number(updatedEmail.sequence_step || activeStep)
      const exists = current.some((item) => Number(item.sequence_step || 1) === step)
      const next = exists
        ? current.map((item) => Number(item.sequence_step || 1) === step ? { ...item, ...updatedEmail } : item)
        : [...current, updatedEmail]
      return next.sort((a, b) => Number(a.sequence_step || 1) - Number(b.sequence_step || 1))
    })
  }

  function selectedTemplateContext() {
    if (!selectedTemplate) return ''
    return [
      `Use this saved outreach template: ${selectedTemplate.name}.`,
      selectedTemplate.category ? `Template category: ${selectedTemplate.category}.` : '',
      selectedTemplate.description ? `Template description: ${selectedTemplate.description}` : '',
      selectedTemplate.subject_guidance ? `Subject guidance: ${selectedTemplate.subject_guidance}` : '',
      `Body guidance: ${selectedTemplate.body_guidance}`,
      selectedTemplate.tone ? `Tone: ${selectedTemplate.tone}` : '',
      selectedTemplate.tags?.length ? `Template tags: ${selectedTemplate.tags.join(', ')}` : '',
    ].filter(Boolean).join('\n')
  }

  useEffect(() => {
    let cancelled = false

    async function loadDraft() {
      if (!activeLeadId) {
        setSequence([])
        setLoadingDraft(false)
        return
      }
      const lead = leads.find((item) => item.id === activeLeadId) || null
      if (!lead?.enriched) {
        setSequence([])
        setLoadingDraft(false)
        return
      }

      setLoadingDraft(true)
      try {
        const savedSequence = await getSavedEmailSequence(lead)
        if (!cancelled) {
          if (hasCompleteSequence(savedSequence)) {
            setSequence(savedSequence)
            setActiveStep(Number(savedSequence[0]?.sequence_step || 1))
          } else {
            const generatedDraft = await generateColdEmailSequence(lead)
            if (!cancelled) {
              setSequence(generatedDraft || [])
              setActiveStep(1)
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setSequence([])
          toast(error.message || 'Failed to load saved sequence', 'error')
        }
      } finally {
        if (!cancelled) {
          setLoadingDraft(false)
        }
      }
    }

    loadDraft()

    return () => {
      cancelled = true
    }
  }, [activeLeadId, leads, toast])

  useEffect(() => {
    let cancelled = false
    async function loadTemplates() {
      try {
        const result = await api.getTemplates()
        if (!cancelled) setTemplates(result || [])
      } catch {
        if (!cancelled) setTemplates([])
      }
    }
    loadTemplates()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!activeLead?.enriched) return
    const needsDeliveryRefresh = sequence.some((item) => item.sent && !item.delivered)
    if (!needsDeliveryRefresh) return

    let cancelled = false
    const refreshSequence = async () => {
      try {
        const latestSequence = await getSavedEmailSequence(activeLead)
        if (!cancelled && hasCompleteSequence(latestSequence)) {
          setSequence(latestSequence)
        }
      } catch {
        // Keep the existing UI state; the next poll or page visit can recover.
      }
    }

    const intervalId = window.setInterval(refreshSequence, 4000)
    refreshSequence()

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [activeLead?.id, activeLead?.enriched, sequence])

  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.company.toLowerCase().includes(search.toLowerCase())
  )

  async function generate() {
    if (!activeLead) return
    setGenerating(true)
    setSequence([])
    try {
      const result = await generateColdEmailSequence(activeLead, { custom_context: selectedTemplateContext() })
      setSequence(result)
      setActiveStep(1)
      toast(selectedTemplate ? `Sequence generated with ${selectedTemplate.name}` : `Email sequence generated for ${activeLead.name}`, 'ai')
    } catch (error) {
      toast(error.message || 'Failed to generate email', 'error')
    } finally {
      setGenerating(false)
    }
  }

  async function handleEnrichFirst() {
    if (!activeLead || enrichingLead) return

    setEnrichingLead(true)
    try {
      const enriched = await enrichLead(activeLead)
      actions.syncLead(enriched)
      setSelectedLeadId(enriched.id)
      setSequence([])
      toast(`Enriched ${enriched.name} and prepared a draft`, 'ai')
    } catch (error) {
      toast(error.message || 'Failed to enrich lead', 'error')
    } finally {
      setEnrichingLead(false)
    }
  }

  function copyEmail() {
    if (!email) return
    const text = `Subject: ${email.subject}\n\n${email.body}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyEmailDraft() {
    if (!email) return
    const text = `To: ${activeLead?.email || ''}\nSubject: ${email.subject}\n\n${email.body}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSendEmail() {
    if (!activeLead || !email || sending) return

    setSending(true)
    try {
      const sentEmail = await sendGeneratedEmail(activeLead, email)
      syncEmail(sentEmail)
      await actions.reload()
      toast(`${email.sequence_label || 'Email'} sent to ${activeLead.name}`, 'success', 5000)
    } catch (error) {
      await copyEmailDraft()
      toast(error.message || 'Failed to send email. Draft copied to clipboard.', 'error', 5000)
    } finally {
      setSending(false)
    }
  }

  async function handleScheduleCurrent() {
    if (!activeLead || !email?.id || scheduleSaving) return

    setScheduleSaving(true)
    try {
      const updated = await api.scheduleEmail(activeLead.id, email.id, toIsoDateTime(scheduleValue))
      syncEmail(updated)
      toast(scheduleValue ? `Scheduled Email ${activeStep}` : `Cleared Email ${activeStep} schedule`, 'success')
    } catch (error) {
      toast(error.message || 'Failed to update schedule', 'error')
    } finally {
      setScheduleSaving(false)
    }
  }

  async function handleApplyCadence() {
    if (!activeLead || sequence.length === 0 || scheduleSaving) return
    const base = new Date(sequenceStartDate)
    if (Number.isNaN(base.getTime())) {
      toast('Choose a valid start date first', 'error')
      return
    }

    setScheduleSaving(true)
    try {
      const updates = await Promise.all(sequence.map((item) => {
        if (item.sent || !item.id) return Promise.resolve(item)
        const step = Number(item.sequence_step || 1)
        const scheduled = new Date(base)
        scheduled.setDate(base.getDate() + (CADENCE_OFFSETS[step] ?? 0))
        return api.scheduleEmail(activeLead.id, item.id, scheduled.toISOString())
      }))
      setSequence(updates.sort((a, b) => Number(a.sequence_step || 1) - Number(b.sequence_step || 1)))
      toast('Follow-up schedule applied to unsent emails', 'success')
    } catch (error) {
      toast(error.message || 'Failed to apply follow-up schedule', 'error')
    } finally {
      setScheduleSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">AI Email Generator</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Generate a four-step outreach sequence and track sent/delivered status</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Config panel */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-4"
        >
          {/* Lead selector */}
          <div className="glass-sm card-shadow rounded-2xl p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">1. Select Lead</h3>

            <div className="relative">
              <button
                onClick={() => setShowLeadPicker(!showLeadPicker)}
                className="w-full flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition-colors hover:border-blue-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
              >
                {activeLead ? (
                  <>
                    <Avatar name={activeLead.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-300">{activeLead.name}</div>
                        {activeLead.has_sent_email && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                            Emailed
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{activeLead.company}</div>
                    </div>
                  </>
                ) : (
                    <span className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
                      <User size={14} /> Select a lead...
                    </span>
                  )}
                <ChevronDown size={14} className={cn('text-slate-500 transition-transform dark:text-slate-400', showLeadPicker && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {showLeadPicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-900"
                  >
                    <input
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] text-slate-700 outline-none placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      autoFocus
                    />
                    <div className="max-h-56 overflow-y-auto custom-scroll">
                      {filteredLeads.map(l => (
                        <button
                          key={l.id}
                          onClick={() => { setSelectedLeadId(l.id); setShowLeadPicker(false) }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-blue-50 dark:hover:bg-slate-800"
                        >
                          <Avatar name={l.name} size="xs" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="text-[12px] font-medium text-slate-800 dark:text-slate-300">{l.name}</div>
                              {l.has_sent_email && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                  Emailed
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{l.company}</div>
                          </div>
                        </button>
                      ))}
                      {filteredLeads.length === 0 && (
                        <div className="px-3 py-3 text-[12px] text-slate-500 dark:text-slate-400">
                          No matching leads found.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="glass-sm card-shadow rounded-2xl p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">2. Choose Template</h3>
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="">No template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {selectedTemplate ? (
              <div className="mt-3 rounded-xl border border-blue-200/60 bg-blue-50/70 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
                    {selectedTemplate.category}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{selectedTemplate.tone}</span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
                  {selectedTemplate.body_guidance}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Templates guide Gemini's angle while still personalizing to the selected lead.
              </p>
            )}
          </div>

          {!activeLead?.enriched && activeLead && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold">Enrich this lead before drafting</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Drafts are auto-prepared for enriched leads only so the content is stronger and Gemini usage stays efficient.
                    </p>
                  </div>
                  <motion.button
                    onClick={handleEnrichFirst}
                    disabled={enrichingLead}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
                    whileHover={!enrichingLead ? { scale: 1.02 } : {}}
                    whileTap={!enrichingLead ? { scale: 0.98 } : {}}
                  >
                    {enrichingLead ? <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" /> : <Zap size={13} />}
                    {enrichingLead ? 'Enriching...' : 'Enrich First'}
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Email preview */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-3"
        >
          <div className="glass-sm card-shadow rounded-2xl overflow-hidden h-full min-h-[500px]">
            {/* Email toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-[12px] text-slate-400 font-mono">outreach-sequence.txt</span>
              </div>
              {email && (
                <div className="flex items-center gap-2">
                  {activeLead?.enriched && (
                    <motion.button
                      onClick={generate}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] transition-colors"
                      whileHover={{ scale: 1.05 }}
                    >
                      <RefreshCw size={11} /> Regenerate Sequence
                    </motion.button>
                  )}
                  <motion.button
                    onClick={copyEmail}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-medium transition-colors"
                    whileHover={{ scale: 1.05 }}
                  >
                    {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                  </motion.button>
                </div>
              )}
            </div>

            <div className="p-6 h-full">
              {sequence.length > 0 && (
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SEQUENCE_STEPS.map((step) => {
                    const stepEmail = sequence.find((item) => Number(item.sequence_step || 1) === step.step)
                    const active = activeStep === step.step
                    const visibleStatuses = getVisibleStatuses(stepEmail)
                    return (
                      <button
                        key={step.step}
                        onClick={() => setActiveStep(step.step)}
                        className={cn(
                          'rounded-xl border px-3 py-2 text-left transition-colors',
                          active
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                        )}
                      >
                        <div className="text-[10px] font-semibold uppercase">Email {step.step}</div>
                        <div className="truncate text-[12px] font-semibold">{stepEmail?.sequence_label || step.label}</div>
                        <div className="mt-1 flex min-h-[16px] flex-wrap gap-1">
                          {visibleStatuses.length > 0 ? visibleStatuses.slice(0, 3).map((status) => (
                            <span
                              key={status.field}
                              className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-semibold', status.activeClass)}
                            >
                              {status.label}
                            </span>
                          )) : (
                            <span className="text-[10px] text-slate-400">Draft</span>
                          )}
                          {stepEmail?.scheduled_at && !stepEmail?.sent && (
                            <span className={cn(
                              'rounded-full border px-1.5 py-0.5 text-[9px] font-semibold',
                              isDue(stepEmail)
                                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                                : 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300'
                            )}>
                              {isDue(stepEmail) ? 'Due' : 'Scheduled'}
                            </span>
                          )}
                          {visibleStatuses.length > 3 && (
                            <span className="rounded-full border border-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                              +{visibleStatuses.length - 3}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              <AnimatePresence mode="wait">
                {!email && !generating && !loadingDraft && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Mail size={28} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        {activeLead?.enriched ? 'Sequence will appear here' : 'No sequence available yet'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {activeLead?.enriched
                          ? 'Preparing or loading the latest four-step sequence for this lead.'
                          : 'Enrich this lead first to create a high-quality sequence automatically.'}
                      </p>
                    </div>
                  </motion.div>
                )}

                {(generating || loadingDraft) && (
                  <motion.div
                    key={loadingDraft ? 'loading-draft' : 'loading'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center float shadow-xl shadow-blue-500/30">
                        <Sparkles size={28} className="text-white" />
                      </div>
                      <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 blur-xl animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {loadingDraft ? 'Loading saved sequence...' : 'Gemini AI is writing...'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {loadingDraft ? `Checking saved sequence for ${activeLead?.name}` : `Crafting a four-step sequence for ${activeLead?.name}`}
                      </p>
                    </div>
                    {/* Typing animation */}
                    <div className="w-full max-w-sm space-y-2">
                      {[100, 80, 60, 90].map((w, i) => (
                        <motion.div
                          key={i}
                          className="h-3 rounded shimmer"
                          style={{ width: `${w}%` }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.1 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {email && !generating && (
                  <motion.div
                    key="email"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {/* To/From fields */}
                    {activeLead && (
                      <div className="space-y-2 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
                        {[
                          { label: 'To', value: `${activeLead.name} <${activeLead.email}>` },
                        ].map(f => (
                          <div key={f.label} className="flex items-center gap-3 text-[13px]">
                            <span className="text-slate-400 w-10">{f.label}:</span>
                            <span className="text-slate-600 dark:text-slate-400">{f.value}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-3 text-[13px]">
                          <span className="text-slate-400 w-10">Subj:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{email.subject}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {EMAIL_STATUSES.map((status) => {
                        return (
                          <span
                            key={status.field}
                            title={`${status.label} is updated automatically`}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold',
                              email[status.field]
                                ? status.activeClass
                                : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'
                            )}
                          >
                            <status.icon size={12} />
                            {status.label}
                          </span>
                        )
                      })}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CalendarClock size={14} className="text-blue-500" />
                          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">Follow-up Schedule</span>
                        </div>
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                          isDue(email)
                            ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                            : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'
                        )}>
                          <Clock size={10} />
                          {isDue(email) ? 'Due now' : formatSchedule(email.scheduled_at)}
                        </span>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <input
                          type="datetime-local"
                          value={scheduleValue}
                          onChange={(event) => setScheduleValue(event.target.value)}
                          disabled={email.sent}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleScheduleCurrent}
                            disabled={scheduleSaving || email.sent}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
                          >
                            {scheduleSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setScheduleValue('')}
                            disabled={scheduleSaving || email.sent}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3 dark:border-slate-700/70">
                        <input
                          type="datetime-local"
                          value={sequenceStartDate}
                          onChange={(event) => setSequenceStartDate(event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none focus:ring-1 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        />
                        <button
                          onClick={handleApplyCadence}
                          disabled={scheduleSaving}
                          className="rounded-xl bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Apply 0/2/5/9 day cadence
                        </button>
                      </div>
                    </div>

                    {/* Email body */}
                    <div className="relative">
                      <textarea
                        value={email.body}
                        onChange={e => syncEmail({ ...email, body: e.target.value })}
                        className="w-full bg-transparent text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed outline-none resize-none min-h-[280px] font-mono"
                        style={{ fontFamily: 'inherit' }}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                      <motion.button
                        onClick={handleSendEmail}
                        disabled={sending}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[12px] font-semibold shadow-sm shadow-blue-500/20 transition-colors"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Send size={13} /> {sending ? 'Sending...' : email.sent ? 'Send Again' : `Send Email ${activeStep}`}
                      </motion.button>
                      <button
                        onClick={copyEmail}
                        className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-[12px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
