import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeProvider } from './hooks/useTheme'
import { LeadsProvider } from './store/leads'
import { AuthProvider, useAuth } from './store/auth'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Import from './pages/Import'
import Email from './pages/Email'
import Enrich from './pages/Enrich'
import Analytics from './pages/Analytics'
import Tasks from './pages/Tasks'
import Templates from './pages/Templates'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import { ToastContainer } from './components/ui/Toast'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  in:      { opacity: 1, y: 0 },
  out:     { opacity: 0, y: -8 },
}
const pageTransition = { type: 'tween', ease: 'easeOut', duration: 0.22 }

function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial" animate="in" exit="out"
        variants={pageVariants} transition={pageTransition}
        style={{ height: '100%' }}
      >
        <Routes location={location}>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/leads"     element={<Leads />} />
          <Route path="/import"    element={<Import />} />
          <Route path="/email"     element={<Email />} />
          <Route path="/tasks"     element={<Tasks />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/enrich"    element={<Enrich />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*"           element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/*" element={<AnimatedRoutes />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LeadsProvider>
          <BrowserRouter>
            <AppRoutes />
            <ToastContainer />
          </BrowserRouter>
        </LeadsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
