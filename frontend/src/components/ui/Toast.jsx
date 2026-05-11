/* eslint-disable react-refresh/only-export-components */
import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, AlertCircle, Info, Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'

// Simple global toast state
let _addToast = null

export function useToast() {
  const toast = useCallback((msg, type = 'success', duration = 3500) => {
    if (_addToast) _addToast({ msg, type, duration, id: Date.now() })
  }, [])

  return {
    toast,
  }
}

const ICONS = {
  success: Check,
  error: X,
  warning: AlertCircle,
  info: Info,
  ai: Sparkles,
}

const STYLES = {
  success: 'bg-emerald-500 text-white',
  error:   'bg-red-500 text-white',
  warning: 'bg-amber-500 text-white',
  info:    'bg-blue-500 text-white',
  ai:      'bg-gradient-to-r from-blue-500 to-violet-500 text-white',
}

function Toast({ id, msg, type, onRemove }) {
  const Icon = ICONS[type] || Info

  useEffect(() => {
    const t = setTimeout(() => onRemove(id), 3500)
    return () => clearTimeout(t)
  }, [id, onRemove])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 32, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className={cn(
        'flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-[13px] font-medium max-w-xs',
        STYLES[type] || STYLES.info
      )}
    >
      <Icon size={14} className="shrink-0" strokeWidth={2.5} />
      <span className="flex-1">{msg}</span>
      <button onClick={() => onRemove(id)} className="opacity-70 hover:opacity-100 transition-opacity">
        <X size={12} />
      </button>
    </motion.div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((t) => setToasts(prev => [...prev, t]), [])
  const remove = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  useEffect(() => {
    _addToast = addToast
    return () => {
      _addToast = null
    }
  }, [addToast])

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast {...t} onRemove={remove} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
