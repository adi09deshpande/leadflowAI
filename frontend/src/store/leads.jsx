/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { api } from '../services/api'
import { useAuth } from './auth'

const LeadsContext = createContext(null)

const initialState = {
  leads: [],
  loading: true,
  error: null,
  selected: null,
  filter: { status: 'all', search: '', source: 'all', sortBy: 'score' },
  view: 'table',
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LEADS':
      return { ...state, leads: action.leads, loading: false, error: null }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false }
    case 'ADD_LEAD':
      return { ...state, leads: [action.lead, ...state.leads] }
    case 'UPDATE_LEAD':
      return {
        ...state,
        leads: state.leads.map((lead) => (lead.id === action.lead.id ? { ...lead, ...action.lead } : lead)),
        selected: state.selected?.id === action.lead.id ? { ...state.selected, ...action.lead } : state.selected,
      }
    case 'DELETE_LEAD':
      return {
        ...state,
        leads: state.leads.filter((lead) => lead.id !== action.id),
        selected: state.selected?.id === action.id ? null : state.selected,
      }
    case 'SELECT_LEAD':
      return { ...state, selected: action.lead }
    case 'SET_FILTER':
      return { ...state, filter: { ...state.filter, ...action.filter } }
    case 'SET_VIEW':
      return { ...state, view: action.view }
    case 'IMPORT_LEADS':
      return { ...state, leads: [...action.leads, ...state.leads] }
    default:
      return state
  }
}

export function LeadsProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)

  const loadLeads = useCallback(async () => {
    if (!isAuthenticated) {
      dispatch({ type: 'SET_LEADS', leads: [] })
      return
    }

    dispatch({ type: 'SET_LOADING', loading: true })
    try {
      const leads = await api.getLeads()
      dispatch({ type: 'SET_LEADS', leads })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: error.message })
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadLeads()
  }, [loadLeads, isAuthenticated])

  const actions = {
    reload: loadLeads,
    addLead: useCallback(async (lead) => {
      const createdLead = await api.createLead(lead)
      dispatch({ type: 'ADD_LEAD', lead: createdLead })
      return createdLead
    }, []),
    updateLead: useCallback(async (lead) => {
      const { id, ...payload } = lead
      const updatedLead = await api.updateLead(id, payload)
      dispatch({ type: 'UPDATE_LEAD', lead: updatedLead })
      return updatedLead
    }, []),
    deleteLead: useCallback(async (id) => {
      await api.deleteLead(id)
      dispatch({ type: 'DELETE_LEAD', id })
    }, []),
    importLeads: useCallback(async (leads) => {
      const result = await api.importLeads(leads)
      dispatch({ type: 'IMPORT_LEADS', leads: result.leads })
      return result
    }, []),
    selectLead: useCallback((lead) => dispatch({ type: 'SELECT_LEAD', lead }), []),
    setFilter: useCallback((filter) => dispatch({ type: 'SET_FILTER', filter }), []),
    setView: useCallback((view) => dispatch({ type: 'SET_VIEW', view }), []),
  }

  const filtered = state.leads
    .filter((lead) => {
      const { status, search, source } = state.filter
      if (status !== 'all' && lead.status !== status) return false
      if (source !== 'all' && lead.source !== source) return false
      if (search) {
        const query = search.toLowerCase()
        return (
          lead.name.toLowerCase().includes(query) ||
          lead.company.toLowerCase().includes(query) ||
          lead.email.toLowerCase().includes(query) ||
          (lead.title || '').toLowerCase().includes(query)
        )
      }
      return true
    })
    .sort((a, b) => {
      const { sortBy } = state.filter
      if (sortBy === 'score') return (b.score || 0) - (a.score || 0)
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'date') return new Date(b.created_at) - new Date(a.created_at)
      return 0
    })

  return (
    <LeadsContext.Provider value={{ ...state, filtered, actions }}>
      {children}
    </LeadsContext.Provider>
  )
}

export const useLeads = () => {
  const context = useContext(LeadsContext)
  if (!context) throw new Error('useLeads must be inside LeadsProvider')
  return context
}
