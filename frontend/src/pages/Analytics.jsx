import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { Mail, Target, Zap, DollarSign } from 'lucide-react'
import { api } from '../services/api'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#64748b']

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(10, 15, 35, 0.92)',
    border: '1px solid rgba(99,179,237,0.15)',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    fontSize: 12,
    color: '#e2e8f0',
  },
  itemStyle: { color: '#94a3b8' },
  labelStyle: { color: '#e2e8f0', fontWeight: 600, marginBottom: 4 },
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    let mounted = true
    api.getAnalytics()
      .then((data) => {
        if (mounted) setAnalytics(data)
      })
      .catch(() => {
        if (mounted) setAnalytics(null)
      })
    return () => {
      mounted = false
    }
  }, [])

  const kpis = analytics?.kpis || {
    avg_lead_score: 0,
    email_send_rate: 0,
    enrichment_rate: 0,
    estimated_pipeline_value: 0,
  }
  const monthlyTrend = analytics?.monthly_trend || []
  const sourceData = (analytics?.source_data || []).map((entry, index) => ({
    ...entry,
    color: COLORS[index % COLORS.length],
  }))
  const funnelData = analytics?.funnel_data || []
  const emailsByDay = analytics?.emails_by_day || []

  const cards = [
    { label: 'Avg Lead Score', value: kpis.avg_lead_score, suffix: '', icon: Target, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Email Send Rate', value: kpis.email_send_rate, suffix: '%', icon: Mail, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
    { label: 'Enrichment Rate', value: kpis.enrichment_rate, suffix: '%', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Pipeline Value', value: kpis.estimated_pipeline_value.toLocaleString(), prefix: '$', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  ]

  const hasAnalytics =
    monthlyTrend.some((entry) => entry.leads || entry.qualified || entry.emails || entry.converted) ||
    sourceData.some((entry) => entry.count)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Live pipeline and outreach metrics from your current project data.</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-sm card-shadow rounded-2xl p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-xl ${card.bg}`}>
                <card.icon size={15} className={card.color} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {card.prefix || ''}{card.value}{card.suffix || ''}
            </div>
            <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {!hasAnalytics && (
        <div className="glass-sm card-shadow rounded-2xl p-10 text-center text-sm text-slate-500">
          Analytics will populate once leads, enrichment, and sent emails exist in your real dataset.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 glass-sm card-shadow rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Pipeline Growth</h3>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Last 8 months of leads, qualified leads, emails sent, and closed wins</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyTrend}>
              <defs>
                {[
                  { id: 'g1', color: '#3b82f6' },
                  { id: 'g2', color: '#8b5cf6' },
                  { id: 'g3', color: '#10b981' },
                ].map(g => (
                  <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={g.color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={g.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} fill="url(#g1)" dot={false} />
              <Area type="monotone" dataKey="qualified" stroke="#8b5cf6" strokeWidth={2} fill="url(#g2)" dot={false} />
              <Area type="monotone" dataKey="converted" stroke="#10b981" strokeWidth={2} fill="url(#g3)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass-sm card-shadow rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Lead Sources</h3>
          <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">Distribution from real lead records</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={3} dataKey="count">
                {sourceData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'rgba(10,15,35,0.92)', border: 'none', borderRadius: 10, fontSize: 11, color: '#e2e8f0' }}
                formatter={(value, _, item) => [`${value} leads`, item.payload.name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {sourceData.map(s => (
              <div key={s.name} className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-slate-600 dark:text-slate-400">{s.name}</span>
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{s.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-sm card-shadow rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Conversion Funnel</h3>
          <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">Current lead counts by pipeline stage</p>
          <div className="space-y-2">
            {funnelData.map((stage, i) => {
              const base = funnelData[0]?.value || 1
              const pct = base ? (stage.value / base) * 100 : 0
              return (
                <div key={stage.name}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{stage.name}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{stage.value}</span>
                  </div>
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <motion.div
                      className="h-full rounded-lg flex items-center px-2"
                      style={{ background: COLORS[i % COLORS.length], width: `${pct}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.35 + i * 0.08, ease: 'easeOut' }}
                    >
                      <span className="text-white text-[10px] font-bold whitespace-nowrap">{pct.toFixed(0)}%</span>
                    </motion.div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="glass-sm card-shadow rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Emails Sent by Day</h3>
          <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">Real send activity from the emails table</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={emailsByDay} barSize={28}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v) => [v, 'Emails Sent']}
              />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  )
}
