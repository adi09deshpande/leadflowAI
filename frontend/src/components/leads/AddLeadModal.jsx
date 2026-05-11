import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Pencil, Plus } from 'lucide-react'
import { useLeads } from '../../store/leads'
import { cn } from '../../lib/utils'

const FIELDS = [
  { key: 'name', label: 'Full Name', placeholder: 'Sarah Chen', required: true },
  { key: 'email', label: 'Email', placeholder: 'sarah@company.com', type: 'email', required: true },
  { key: 'company', label: 'Company', placeholder: 'Acme Corp', required: true },
  { key: 'title', label: 'Job Title', placeholder: 'VP of Engineering' },
  { key: 'industry', label: 'Industry', placeholder: 'SaaS' },
  { key: 'company_size', label: 'Company Size', placeholder: '51-200' },
  { key: 'revenue', label: 'Revenue', placeholder: '$5M-$20M' },
  { key: 'phone', label: 'Phone', placeholder: '+1 (415) 555-0101' },
  { key: 'location', label: 'Location', placeholder: 'San Francisco, CA' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/username' },
  { key: 'website', label: 'Website', placeholder: 'company.com' },
]

const SOURCES = ['LinkedIn', 'Cold Outreach', 'Referral', 'Website', 'Event', 'GitHub', 'Other']

const EMPTY_FORM = {
  name: '',
  email: '',
  company: '',
  title: '',
  industry: '',
  company_size: '',
  revenue: '',
  phone: '',
  location: '',
  linkedin: '',
  website: '',
  source: 'LinkedIn',
  status: 'new',
}

export default function AddLeadModal({ onClose, lead = null }) {
  const { actions } = useLeads()
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(lead || {}),
  }))
  const [errors, setErrors] = useState({})
  const isEditing = Boolean(lead?.id)

  function validate() {
    const errs = {}
    if (!form.name) errs.name = 'Required'
    if (!form.email) errs.email = 'Required'
    if (!form.company) errs.company = 'Required'
    return errs
  }

  async function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    if (isEditing) {
      await actions.updateLead({
        ...lead,
        ...form,
      })
    } else {
      await actions.addLead({
        ...form,
        enriched: false,
        tags: [],
      })
    }
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full max-w-lg glass card-shadow rounded-2xl overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {isEditing ? 'Edit Lead' : 'Add New Lead'}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isEditing ? 'Update the lead details below' : 'Fill in the lead details below'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scroll">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(f => (
              <div key={f.key} className={f.key === 'name' || f.key === 'email' ? 'col-span-2' : ''}>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                <input
                  type={f.type || 'text'}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className={cn(
                    'w-full px-3 py-2 text-[13px] rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none border transition-all',
                    errors[f.key]
                      ? 'border-red-400'
                      : 'border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20'
                  )}
                />
                {errors[f.key] && <p className="text-red-400 text-[10px] mt-0.5">{errors[f.key]}</p>}
              </div>
            ))}
          </div>

          {/* Source */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Source</label>
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map(s => (
                <button
                  key={s}
                  onClick={() => setForm(p => ({ ...p, source: s }))}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all',
                    form.source === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-200/50 dark:border-slate-800/50">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <motion.button
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold shadow-sm shadow-blue-500/20 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isEditing ? <Pencil size={14} /> : <Plus size={14} />}
            {isEditing ? 'Save Changes' : 'Add Lead'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
