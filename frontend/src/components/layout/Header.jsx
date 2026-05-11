import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, LogOut, Plus, Sparkles } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import ThemeToggle from '../ui/ThemeToggle'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/leads': 'Leads',
  '/import': 'Import Leads',
  '/email': 'Email AI',
  '/enrich': 'AI Enrich',
  '/analytics': 'Analytics',
}

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [showNotif, setShowNotif] = useState(false)
  const title = PAGE_TITLES[location.pathname] || 'LeadFlow AI'

  return (
    <header className="h-14 px-6 flex items-center gap-4 bg-white dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/60 shrink-0 z-10">
      <motion.h1
        key={title}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-semibold text-slate-800 dark:text-slate-200 mr-2"
      >
        {title}
      </motion.h1>

      <div className="flex items-center gap-2 ml-auto">
        <motion.div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold border border-blue-200/50 dark:border-blue-500/20"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <Sparkles size={10} />
          AI Active
        </motion.div>

        <ThemeToggle />

        <div className="relative">
          <motion.button
            onClick={() => setShowNotif(!showNotif)}
            className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell size={15} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full pulse-glow" />
          </motion.button>

          <AnimatePresence>
            {showNotif && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-72 glass card-shadow rounded-2xl overflow-hidden z-50"
              >
                <div className="p-3 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Notifications</span>
                </div>
                <div className="px-3 py-4 text-[12px] text-slate-500 dark:text-slate-400">
                  No notifications yet.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          onClick={() => navigate('/leads', { state: { openAddLead: true } })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold shadow-sm shadow-blue-500/20 transition-colors"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
            <Plus size={13} />
            Add Lead
          </motion.button>

        <motion.button
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <LogOut size={13} />
          Logout
        </motion.button>
      </div>
    </header>
  )
}
