const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const AUTH_TOKEN_STORAGE_KEY = 'leadflow-auth-token'

let authToken = typeof window !== 'undefined' ? window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) : null

export function getStoredAuthToken() {
  return authToken
}

export function setStoredAuthToken(token) {
  authToken = token || null
  if (typeof window === 'undefined') return

  if (authToken) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken)
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  }
}

function getErrorMessage(error) {
  if (!error) return 'Request failed'

  if (typeof error.detail === 'string') {
    return error.detail
  }

  if (Array.isArray(error.detail)) {
    return error.detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item?.msg) return item.msg
        return JSON.stringify(item)
      })
      .join(' ')
  }

  if (error.detail && typeof error.detail === 'object') {
    const message = typeof error.detail.message === 'string' ? error.detail.message : 'Request failed'
    const extra = Array.isArray(error.detail.errors) ? error.detail.errors.slice(0, 3) : []
    return extra.length > 0 ? `${message} ${extra.join(' ')}` : message
  }

  return error.message || 'Request failed'
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(getErrorMessage(error))
  }

  return response.json()
}

export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getLeads: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/leads${query ? `?${query}` : ''}`)
  },
  getLead: (id) => request(`/leads/${id}`),
  createLead: (data) => request('/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id, data) => request(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteLead: (id) => request(`/leads/${id}`, { method: 'DELETE' }),
  importLeads: (leads) => request('/leads/import', { method: 'POST', body: JSON.stringify({ leads }) }),
  enrichLead: (id) => request(`/ai/enrich/${id}`, { method: 'POST' }),
  generateEmail: (id, params) => request(`/ai/email/${id}`, { method: 'POST', body: JSON.stringify(params) }),
  getEmailDraft: (id) => request(`/ai/email/${id}/draft`),
  getEmailSequence: (id) => request(`/ai/email/${id}/sequence`),
  generateEmailSequence: (id, params = {}) => request(`/ai/email/${id}/sequence`, { method: 'POST', body: JSON.stringify(params) }),
  sendEmail: (id, payload) => request(`/ai/email/${id}/send`, { method: 'POST', body: JSON.stringify(payload) }),
  scheduleEmail: (leadId, emailId, scheduledAt) => request(`/ai/email/${leadId}/${emailId}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify({ scheduled_at: scheduledAt || null }),
  }),
  generateSummary: (id) => request(`/ai/summary/${id}`, { method: 'POST' }),
  bulkEnrich: (ids) => request('/ai/bulk-enrich', { method: 'POST', body: JSON.stringify({ ids }) }),
  getTasks: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/tasks${query ? `?${query}` : ''}`)
  },
  createTask: (payload) => request('/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id, payload) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  getTemplates: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/templates${query ? `?${query}` : ''}`)
  },
  createTemplate: (payload) => request('/templates', { method: 'POST', body: JSON.stringify(payload) }),
  updateTemplate: (id, payload) => request(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
  getStats: () => request('/stats'),
  getActivity: () => request('/activity'),
  getAnalytics: () => request('/analytics'),
}
