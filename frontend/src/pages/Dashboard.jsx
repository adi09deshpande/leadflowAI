import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, Mail, Zap, ArrowUpRight, Sparkles, Target } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useLeads } from '../store/leads'
import { api } from '../services/api'
import Avatar from '../components/ui/Avatar'
import StatusBadge from '../components/ui/StatusBadge'
import ScoreRing from '../components/ui/ScoreRing'
import { useToast } from '../components/ui/Toast'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
}

const STATUS_COLORS = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#8b5cf6',
  proposal: '#f97316',
  closed_won: '#10b981',
}

export default function Dashboard() {
  const { leads, actions } = useLeads()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [autoEnriching, setAutoEnriching] = useState(false)

  const loadDashboardData = useCallback(async () => {
    try {
      const [statsResult, activityResult, analyticsResult] = await Promise.all([
        api.getStats(),
        api.getActivity(),
        api.getAnalytics(),
      ])
      setStats(statsResult)
      setActivity(activityResult.items || [])
      setAnalytics(analyticsResult)
    } catch {
      setStats(null)
      setActivity([])
      setAnalytics(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function syncDashboardData() {
      try {
        const [statsResult, activityResult, analyticsResult] = await Promise.all([
          api.getStats(),
          api.getActivity(),
          api.getAnalytics(),
        ])
        if (cancelled) return
        setStats(statsResult)
        setActivity(activityResult.items || [])
        setAnalytics(analyticsResult)
      } catch {
        if (cancelled) return
        setStats(null)
        setActivity([])
        setAnalytics(null)
      }
    }

    syncDashboardData()

    return () => {
      cancelled = true
    }
  }, [loadDashboardData, leads])

  async function handleAutoEnrich() {
    if (!leads.length || autoEnriching) return

    setAutoEnriching(true)
    try {
      await api.bulkEnrich(leads.map((lead) => lead.id))
      await actions.reload()
      await loadDashboardData()
      toast(`Auto enriched ${leads.length} leads`, 'ai')
    } catch (error) {
      toast(error.message || 'Failed to auto enrich leads', 'error')
    } finally {
      setAutoEnriching(false)
    }
  }

  const recentLeads = leads.slice(0, 5)
  const trendData = analytics?.weekly_activity || []
  const statusPie = [
    { name: 'New', value: leads.filter((lead) => lead.status === 'new').length, color: STATUS_COLORS.new },
    { name: 'Contacted', value: leads.filter((lead) => lead.status === 'contacted').length, color: STATUS_COLORS.contacted },
    { name: 'Qualified', value: leads.filter((lead) => lead.status === 'qualified').length, color: STATUS_COLORS.qualified },
    { name: 'Proposal', value: leads.filter((lead) => lead.status === 'proposal').length, color: STATUS_COLORS.proposal },
    { name: 'Won', value: leads.filter((lead) => lead.status === 'closed_won').length, color: STATUS_COLORS.closed_won },
  ].filter((entry) => entry.value > 0)

  const statCards = [
    {
      label: 'Total Leads',
      value: String(stats?.total_leads ?? leads.length),
      change: `${stats?.new_this_week ?? 0} new this week`,
      icon: Users,
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Qualified',
      value: String(stats?.qualified ?? 0),
      change: `${stats?.enriched ?? 0} enriched`,
      icon: Target,
      bg: 'bg-violet-50 dark:bg-violet-500/10',
      iconColor: 'text-violet-500',
    },
    {
      label: 'Emails Sent',
      value: String(stats?.emails_sent ?? 0),
      change: 'Live API-backed workflow',
      icon: Mail,
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
    {
      label: 'Conversion',
      value: `${stats?.conversion_rate ?? 0}%`,
      change: 'Closed won rate',
      icon: TrendingUp,
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 p-6 text-white shadow-xl shadow-blue-500/20"
      >
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-32 -translate-y-32 rounded-full bg-white/5" />
        <div className="absolute bottom-0 left-1/2 h-48 w-48 translate-y-24 rounded-full bg-white/5" />

        <div className="relative flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Sparkles size={14} className="opacity-80" />
              <span className="text-xs font-medium text-blue-200">AI-Powered CRM</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">LeadFlow overview</h2>
            <p className="mt-1 text-sm text-blue-200">
              You have <strong className="text-white">{stats?.new_this_week ?? 0} new leads</strong> this week.
            </p>
          </div>
          <div className="flex gap-2">
            <motion.button
              onClick={handleAutoEnrich}
              disabled={!leads.length || autoEnriching}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              whileHover={!autoEnriching && leads.length ? { scale: 1.03 } : {}}
              whileTap={!autoEnriching && leads.length ? { scale: 0.97 } : {}}
            >
              <span className="flex items-center gap-2">
                <Zap size={14} />
                {autoEnriching ? 'Enriching...' : 'Auto Enrich'}
              </span>
            </motion.button>
            <motion.button
              onClick={() => navigate('/email')}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="flex items-center gap-2">
                <Mail size={14} />
                Generate Emails
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <motion.div key={stat.label} variants={item} className="glass-sm card-shadow group cursor-default rounded-2xl p-4 transition-transform hover:scale-[1.02]">
            <div className="mb-3 flex items-start justify-between">
              <div className={`rounded-xl p-2 ${stat.bg}`}>
                <stat.icon size={15} className={stat.iconColor} />
              </div>
              <ArrowUpRight size={12} className="text-slate-300 transition-colors group-hover:text-emerald-500 dark:text-slate-700" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{stat.value}</div>
            <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{stat.label}</div>
            <div className="mt-1 text-[11px] font-medium text-emerald-500">{stat.change}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-sm card-shadow rounded-2xl p-5 lg:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Lead Activity</h3>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Leads and emails this week</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="emailsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  border: '1px solid rgba(99,179,237,0.15)',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  fontSize: 12,
                  color: '#e2e8f0',
                }}
              />
              <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} fill="url(#leadsGrad)" dot={false} />
              <Area type="monotone" dataKey="emails" stroke="#8b5cf6" strokeWidth={2} fill="url(#emailsGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-sm card-shadow rounded-2xl p-5"
        >
          <h3 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Pipeline Status</h3>
          <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">Lead distribution</p>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={statusPie} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                {statusPie.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 11,
                  color: '#e2e8f0',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {statusPie.map((status) => (
              <div key={status.name} className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: status.color }} />
                  <span className="text-slate-600 dark:text-slate-400">{status.name}</span>
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{status.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-sm card-shadow overflow-hidden rounded-2xl lg:col-span-2"
        >
          <div className="flex items-center justify-between border-b border-slate-200/50 px-5 py-4 dark:border-slate-800/50">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Recent Leads</h3>
            <button onClick={() => navigate('/leads')} className="flex items-center gap-1 text-[11px] font-medium text-blue-500 hover:text-blue-600">
              View all <ArrowUpRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {recentLeads.map((lead, index) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + index * 0.06 }}
                className="group flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30"
                onClick={() => navigate('/leads')}
              >
                <Avatar name={lead.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-200">{lead.name}</span>
                    {lead.enriched && <Sparkles size={10} className="shrink-0 text-blue-400" />}
                  </div>
                  <div className="truncate text-[11px] text-slate-600 dark:text-slate-400">{lead.title} - {lead.company}</div>
                </div>
                <StatusBadge status={lead.status} />
                <ScoreRing score={lead.score} size={32} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-sm card-shadow overflow-hidden rounded-2xl"
        >
          <div className="flex items-center gap-2 border-b border-slate-200/50 px-5 py-4 dark:border-slate-800/50">
            <div className="pulse-glow h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">AI Activity</h3>
          </div>
          <div className="max-h-[23rem] space-y-2 overflow-y-auto p-3 custom-scroll">
            {activity.length === 0 && (
              <div className="rounded-xl p-2 text-[12px] text-slate-400">No recent activity yet.</div>
            )}
            {activity.map((entry, index) => (
              <motion.div
                key={`${entry.type}-${index}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className="flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30"
              >
                <div className="rounded-lg bg-blue-50 p-1.5 dark:bg-blue-500/10">
                  <Zap size={11} className="text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] leading-tight text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{entry.action}</span>
                    {' - '}{entry.target}
                  </p>
                </div>
                <span className="whitespace-nowrap text-[10px] text-slate-400">{entry.time}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
