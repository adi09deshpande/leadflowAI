import { api } from './api'

export async function enrichLead(lead) {
  return api.enrichLead(lead.id)
}

export async function generateColdEmail(lead, params = {}) {
  return api.generateEmail(lead.id, params)
}

export async function getSavedEmailDraft(lead) {
  return api.getEmailDraft(lead.id)
}

export async function sendGeneratedEmail(lead, email) {
  return api.sendEmail(lead.id, {
    email_id: email.id,
    subject: email.subject,
    body: email.body,
  })
}

export async function generateProspectSummary(lead) {
  const result = await api.generateSummary(lead.id)
  return result.summary
}
