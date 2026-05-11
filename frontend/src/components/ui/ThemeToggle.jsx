import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/utils'

export default function ThemeToggle({ mini = false }) {
  const { isDark, toggle } = useTheme()

  if (mini) {
    return (
      <motion.button
        onClick={toggle}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Toggle theme"
      >
        <motion.div
          key={isDark ? 'moon' : 'sun'}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
        </motion.div>
      </motion.button>
    )
  }

  return (
    <motion.button
      onClick={toggle}
      className={cn(
        'relative flex items-center w-12 h-6 rounded-full transition-colors duration-300 px-0.5',
        isDark ? 'bg-blue-600' : 'bg-slate-200 hover:bg-slate-300'
      )}
      whileTap={{ scale: 0.95 }}
      title="Toggle theme"
    >
      <motion.div
        className="flex items-center justify-center w-5 h-5 bg-white rounded-full shadow-sm"
        animate={{ x: isDark ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      >
        <motion.div
          key={isDark ? 'moon' : 'sun'}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {isDark
            ? <Moon size={10} className="text-blue-600" />
            : <Sun size={10} className="text-amber-500" />
          }
        </motion.div>
      </motion.div>
    </motion.button>
  )
}
