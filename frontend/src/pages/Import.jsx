import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Check, AlertCircle, Sparkles, ChevronRight } from 'lucide-react'
import Papa from 'papaparse'
import { useLeads } from '../store/leads'
import { cn } from '../lib/utils'
import Avatar from '../components/ui/Avatar'

const REQUIRED_FIELDS = ['name', 'email', 'company']
const RECOMMENDED_FIELDS = ['title', 'source', 'linkedin', 'website', 'location', 'industry']
const OPTIONAL_FIELDS = ['phone', 'company_size', 'revenue', 'notes']
const ALLOWED_FIELDS = [...REQUIRED_FIELDS, ...RECOMMENDED_FIELDS, ...OPTIONAL_FIELDS]
const DISPLAY_FIELD_ORDER = [...REQUIRED_FIELDS, ...RECOMMENDED_FIELDS, ...OPTIONAL_FIELDS]
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i

const FIELD_MAP = {
  name: 'name',
  'full name': 'name',
  full_name: 'name',
  contact: 'name',
  email: 'email',
  'email address': 'email',
  email_address: 'email',
  company: 'company',
  'company name': 'company',
  company_name: 'company',
  organization: 'company',
  title: 'title',
  'job title': 'title',
  job_title: 'title',
  position: 'title',
  role: 'title',
  source: 'source',
  'lead source': 'source',
  lead_source: 'source',
  linkedin: 'linkedin',
  'linkedin url': 'linkedin',
  linkedin_url: 'linkedin',
  website: 'website',
  url: 'website',
  city: 'location',
  location: 'location',
  industry: 'industry',
  phone: 'phone',
  'phone number': 'phone',
  phone_number: 'phone',
  tel: 'phone',
  'company size': 'company_size',
  company_size: 'company_size',
  size: 'company_size',
  revenue: 'revenue',
  arr: 'revenue',
  notes: 'notes',
}

function sanitizeHeader(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[-.]/g, ' ')
    .replace(/\s+/g, ' ')
}

function normalizeKey(key) {
  const normalized = sanitizeHeader(key)
  return FIELD_MAP[normalized] || normalized.replace(/\s+/g, '_')
}

function sanitizeCell(value) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function isMeaningfulRow(row) {
  return Object.values(row).some((value) => {
    if (typeof value === 'string') return value.trim() !== ''
    return value !== undefined && value !== null
  })
}

export default function ImportPage() {
  const { actions } = useLeads()
  const [stage, setStage] = useState('upload')
  const [dragging, setDragging] = useState(false)
  const [parsed, setParsed] = useState([])
  const [errors, setErrors] = useState([])
  const [progress, setProgress] = useState(0)
  const [importCount, setImportCount] = useState(0)

  const parseFile = useCallback((file) => {
    setErrors([])
    setParsed([])
    setProgress(0)

    if (!file) {
      setErrors(['Choose a CSV file to continue.'])
      setStage('upload')
      return
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrors(['Only CSV files are supported. Please upload a file ending in .csv.'])
      setStage('upload')
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: normalizeKey,
      complete: ({ data, errors: parseErrors, meta }) => {
        const nextErrors = []
        const fields = Array.isArray(meta?.fields) ? meta.fields.filter(Boolean) : []

        if (parseErrors.length > 0) {
          parseErrors.slice(0, 8).forEach((error) => {
            const rowLabel = Number.isFinite(error.row) ? `Row ${error.row + 1}: ` : ''
            nextErrors.push(`${rowLabel}${error.message}`)
          })
        }

        if (fields.length === 0) {
          setErrors(['The CSV could not be read. Make sure the first row contains column headers.'])
          setStage('upload')
          return
        }

        const duplicateFields = fields.filter((field, index) => fields.indexOf(field) !== index)
        if (duplicateFields.length > 0) {
          nextErrors.push(`Duplicate columns found: ${[...new Set(duplicateFields)].join(', ')}.`)
        }

        const missingHeaders = REQUIRED_FIELDS.filter((field) => !fields.includes(field))
        if (missingHeaders.length > 0) {
          nextErrors.push(`Missing required columns: ${missingHeaders.join(', ')}.`)
        }

        const unsupportedHeaders = fields.filter((field) => !ALLOWED_FIELDS.includes(field))
        if (unsupportedHeaders.length > 0) {
          nextErrors.push(
            `Unsupported columns: ${unsupportedHeaders.join(', ')}. Allowed columns are ${DISPLAY_FIELD_ORDER.join(', ')}.`
          )
        }

        const meaningfulRows = data.filter(isMeaningfulRow)
        if (meaningfulRows.length === 0) {
          nextErrors.push('The CSV has headers, but no lead rows were found.')
        }

        const validRows = meaningfulRows.map((row, index) => {
          const cleaned = DISPLAY_FIELD_ORDER.reduce((result, field) => {
            const value = sanitizeCell(row[field])
            if (value !== undefined) {
              result[field] = value
            }
            return result
          }, {})

          REQUIRED_FIELDS.forEach((field) => {
            if (!cleaned[field]) {
              nextErrors.push(`Row ${index + 2}: Missing ${field}.`)
            }
          })

          if (cleaned.email && !EMAIL_PATTERN.test(cleaned.email)) {
            nextErrors.push(`Row ${index + 2}: Invalid email address "${cleaned.email}".`)
          }

          return {
            ...cleaned,
            status: 'new',
            enriched: false,
            tags: [],
          }
        })

        if (nextErrors.length > 0) {
          setParsed(validRows)
          setErrors(nextErrors.slice(0, 12))
          setStage(validRows.length > 0 ? 'preview' : 'upload')
          return
        }

        setParsed(validRows)
        setErrors([])
        setStage('preview')
      },
      error: (error) => {
        setErrors([error.message || 'Failed to parse CSV file.'])
        setStage('upload')
      },
    })
  }, [])

  function onDrop(event) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    parseFile(file)
  }

  function onFileChange(event) {
    const file = event.target.files[0]
    parseFile(file)
  }

  async function handleImport() {
    if (errors.length > 0 || parsed.length === 0) {
      return
    }

    setStage('importing')
    const total = parsed.length

    try {
      for (let index = 0; index < total; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 60))
        setProgress(Math.round(((index + 1) / total) * 100))
      }

      await actions.importLeads(parsed)
      setImportCount(parsed.length)
      setStage('done')
    } catch (error) {
      setErrors([error.message || 'Import failed.'])
      setStage('preview')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">Import Leads</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Upload a CSV file to bulk-import leads into your CRM</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {stage === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <label
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-16 transition-all duration-200',
                dragging
                  ? 'scale-[1.01] border-blue-500 bg-blue-50/50 dark:bg-blue-500/10'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/30'
              )}
            >
              <input type="file" accept=".csv" onChange={onFileChange} className="sr-only" />
              <motion.div
                animate={{ y: dragging ? -6 : 0 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10"
              >
                <Upload size={28} className="text-blue-500" />
              </motion.div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {dragging ? 'Drop it!' : 'Drop your CSV file here'}
                </p>
                <p className="mt-1 text-xs text-slate-400">or click to browse - CSV files only</p>
              </div>
              {dragging && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 rounded-2xl border-2 border-blue-500 bg-blue-500/5 pointer-events-none"
                />
              )}
            </label>

            {errors.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                <div className="space-y-0.5">
                  {errors.map((error, index) => (
                    <p key={index} className="text-[12px] text-rose-700 dark:text-rose-300">{error}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-sm rounded-2xl p-5">
              <h3 className="mb-3 text-xs font-semibold text-slate-800 dark:text-slate-300">CSV Format Guide</h3>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_FIELDS.map((field) => (
                  <span
                    key={field}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                  >
                    {field} *
                  </span>
                ))}
                {RECOMMENDED_FIELDS.map((field) => (
                  <span
                    key={field}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
                  >
                    {field}
                  </span>
                ))}
                {OPTIONAL_FIELDS.map((field) => (
                  <span
                    key={field}
                    className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {field}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Recommended columns help with better enrichment and outreach quality. Aliases like `full name`, `email address`,
                `company name`, `job title`, and `lead source` are also accepted.
              </p>
            </div>
          </motion.div>
        )}

        {stage === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="glass-sm flex items-center gap-3 rounded-2xl p-4">
              <div className="flex flex-1 items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                  <FileText size={16} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{parsed.length} leads ready to import</p>
                  {errors.length > 0 && <p className="text-xs text-rose-500">{errors.length} issues to fix</p>}
                </div>
              </div>
              <button onClick={() => setStage('upload')} className="text-[12px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                Change file
              </button>
              <motion.button
                onClick={handleImport}
                disabled={errors.length > 0 || parsed.length === 0}
                className="rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-blue-700"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} />
                  Import {parsed.length} Leads
                </span>
              </motion.button>
            </div>

            {errors.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                <div className="space-y-0.5">
                  {errors.map((error, index) => (
                    <p key={index} className="text-[12px] text-rose-700 dark:text-rose-300">{error}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-sm overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200/50 dark:border-slate-800/50">
                      {['Lead', 'Company', 'Title', 'Source'].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 8).map((lead, index) => (
                      <motion.tr
                        key={`${lead.email}-${index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="border-b border-slate-100 dark:border-slate-800/30"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={lead.name} size="xs" />
                            <div>
                              <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{lead.name}</div>
                              <div className="text-[11px] text-slate-400">{lead.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-slate-600 dark:text-slate-400">{lead.company}</td>
                        <td className="px-4 py-2.5 text-[12px] text-slate-500">{lead.title || '-'}</td>
                        <td className="px-4 py-2.5 text-[12px] text-slate-500">{lead.source || '-'}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 8 && (
                  <div className="bg-slate-50/50 px-4 py-3 text-[12px] text-slate-400 dark:bg-slate-800/20">
                    + {parsed.length - 8} more leads
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'importing' && (
          <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center gap-6 py-24">
            <div className="relative h-24 w-24">
              <svg className="h-24 w-24 -rotate-90">
                <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-slate-800" />
                <motion.circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="url(#importGrad)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={251}
                  animate={{ strokeDashoffset: 251 - (251 * progress / 100) }}
                  transition={{ duration: 0.2 }}
                />
                <defs>
                  <linearGradient id="importGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="gradient-text text-lg font-bold">{progress}%</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Importing leads...</p>
              <p className="mt-1 text-xs text-slate-400">Processing {Math.round(parsed.length * progress / 100)} of {parsed.length}</p>
            </div>
          </motion.div>
        )}

        {stage === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 py-24">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-xl shadow-emerald-500/30"
            >
              <Check size={36} className="text-white" strokeWidth={3} />
            </motion.div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Import Complete!</h2>
              <p className="mt-1 text-sm text-slate-500">
                <strong className="text-slate-700 dark:text-slate-300">{importCount} leads</strong> added to your CRM
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStage('upload')}
                className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Import More
              </button>
              <motion.a
                href="/leads"
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                whileHover={{ scale: 1.03 }}
              >
                View Leads <ChevronRight size={14} />
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
