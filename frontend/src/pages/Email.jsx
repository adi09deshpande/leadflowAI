import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Sparkles, Copy, Check, RefreshCw, Send, ChevronDown, User, AlertTriangle, Zap } from 'lucide-react'
import { useLeads } from '../store/leads'
import { enrichLead, generateColdEmail, getSavedEmailDraft, sendGeneratedEmail } from '../services/gemini'
import { cn } from '../lib/utils'
import Avatar from '../components/ui/Avatar'
import { useToast } from '../components/ui/Toast'

export default function EmailPage() {
  const { leads, actions } = useLeads()
  const { toast } = useToast()
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [email, setEmail] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [enrichingLead, setEnrichingLead] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showLeadPicker, setShowLeadPicker] = useState(false)
  const [search, setSearch] = useState('')
  const activeLead = leads.find((lead) => lead.id === selectedLeadId) || leads[0] || null

  useEffect(() => {
    let cancelled = false

    async function loadDraft() {
      if (!activeLead) {
        setEmail(null)
        return
      }
      if (!activeLead.enriched) {
        setEmail(null)
        setLoadingDraft(false)
        return
      }

      setLoadingDraft(true)
      try {
        const draft = await getSavedEmailDraft(activeLead)
        if (!cancelled) {
          if (draft) {
            setEmail(draft)
          } else {
            const generatedDraft = await generateColdEmail(activeLead)
            if (!cancelled) {
              setEmail(generatedDraft || null)
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setEmail(null)
          toast(error.message || 'Failed to load saved draft', 'error')
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
  }, [activeLead, toast])

  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.company.toLowerCase().includes(search.toLowerCase())
  )

  async function generate() {
    if (!activeLead) return
    setGenerating(true)
    setEmail(null)
    try {
      const result = await generateColdEmail(activeLead)
      setEmail(result)
      toast(`Email generated for ${activeLead.name}`, 'ai')
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
      await actions.updateLead(enriched)
      setSelectedLeadId(enriched.id)
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
      setEmail(sentEmail)
      await actions.reload()
      toast(`Email sent to ${activeLead.name}`, 'success', 5000)
    } catch (error) {
      await copyEmailDraft()
      toast(error.message || 'Failed to send email. Draft copied to clipboard.', 'error', 5000)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">AI Email Generator</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Generate personalized cold emails powered by Gemini AI</p>
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
                <span className="ml-2 text-[12px] text-slate-400 font-mono">cold-email.txt</span>
              </div>
              {email && (
                <div className="flex items-center gap-2">
                  {activeLead?.enriched && (
                    <motion.button
                      onClick={generate}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] transition-colors"
                      whileHover={{ scale: 1.05 }}
                    >
                      <RefreshCw size={11} /> Regenerate
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
                        {activeLead?.enriched ? 'Draft will appear here' : 'No draft available yet'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {activeLead?.enriched
                          ? 'Preparing or loading the latest draft for this lead.'
                          : 'Enrich this lead first to create a high-quality draft automatically.'}
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
                        {loadingDraft ? 'Loading saved draft...' : 'Gemini AI is writing...'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {loadingDraft ? `Checking saved drafts for ${activeLead?.name}` : `Crafting a personalized email for ${activeLead?.name}`}
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

                    {/* Email body */}
                    <div className="relative">
                      <textarea
                        value={email.body}
                        onChange={e => setEmail({ ...email, body: e.target.value })}
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
                        <Send size={13} /> {sending ? 'Sending...' : email.sent ? 'Send Again' : 'Send Email'}
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
