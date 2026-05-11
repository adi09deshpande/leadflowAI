import { useState } from 'react'
import { motion } from 'framer-motion'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Lock, Sparkles, User } from 'lucide-react'
import { useAuth } from '../store/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isAuthenticated) {
    const nextPath = location.state?.from?.pathname || '/'
    return <Navigate to={nextPath} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const result = await login(username, password)
    if (!result.ok) {
      setError(result.message)
      return
    }

    navigate(location.state?.from?.pathname || '/', { replace: true })
  }

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/70 bg-white/92 shadow-2xl shadow-blue-500/10 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/90"
      >
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 p-8 text-white">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Sparkles size={22} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">LeadFlow AI</h1>
          <p className="mt-2 text-sm text-blue-100">Sign in to access the CRM workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-8">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Username
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <User size={16} className="text-slate-400" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
                placeholder="Enter username"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Password
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <Lock size={16} className="text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-700"
          >
            Sign In
          </button>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            Demo credentials: `admin` / `admin123`
          </div>
        </form>
      </motion.div>
    </div>
  )
}
