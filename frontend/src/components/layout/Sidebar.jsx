import { motion, AnimatePresence } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Mail, Zap, BarChart3,
  ChevronLeft, Sparkles, Import
} from 'lucide-react'
import { cn } from '../../lib/utils'
import ThemeToggle from '../ui/ThemeToggle'

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', badge: null },
  { path: '/leads', icon: Users, label: 'Leads', badge: null },
  { path: '/import', icon: Import, label: 'Import', badge: null },
  { path: '/email', icon: Mail, label: 'Email AI', badge: null },
  { path: '/enrich', icon: Zap, label: 'AI Enrich', badge: null },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', badge: null },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative z-20 flex flex-col h-screen bg-white/92 dark:bg-slate-900/80 sidebar-shadow glass border-r border-slate-200/80 dark:border-slate-800/60 overflow-hidden no-select"
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
        <motion.div
          className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shrink-0 glow-blue"
          whileHover={{ scale: 1.05, rotate: 5 }}
        >
          <Sparkles size={15} className="text-white" />
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <span className="font-bold text-[15px] tracking-tight gradient-text whitespace-nowrap">
                LeadFlow AI
              </span>
              <div className="text-[10px] text-slate-500 dark:text-slate-500 font-medium tracking-wider uppercase">
                CRM Platform
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!collapsed && (
          <motion.button
            onClick={() => setCollapsed(true)}
            className="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft size={14} />
          </motion.button>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto custom-scroll">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-slate-200/50 dark:border-slate-800/50 shrink-0">
        <div className="flex items-center gap-2 p-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            LF
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">LeadFlow Workspace</div>
                <div className="text-[10px] text-slate-500 truncate">Local environment</div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ThemeToggle mini />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {collapsed && (
          <motion.button
            onClick={() => setCollapsed(false)}
            className="w-full mt-1 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft size={14} className="rotate-180" />
          </motion.button>
        )}
      </div>
    </motion.aside>
  )
}

function NavItem({ item, collapsed }) {
  const { icon: Icon, label, badge, path } = item

  return (
    <NavLink to={path} end={path === '/'}>
      {({ isActive }) => (
        <motion.div
          className={cn(
            'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer',
            isActive
              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
          )}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.97 }}
        >
          {isActive && (
            <motion.div
              layoutId="nav-active"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}

          <Icon
            size={16}
            className={cn(
              'shrink-0 transition-colors',
              isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
            )}
          />

          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex-1 whitespace-nowrap"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>

          {!collapsed && badge && (
            <AnimatePresence>
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full"
              >
                {badge}
              </motion.span>
            </AnimatePresence>
          )}

          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {label}
            </div>
          )}
        </motion.div>
      )}
    </NavLink>
  )
}
