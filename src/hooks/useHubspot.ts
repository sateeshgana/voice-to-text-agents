// src/hooks/useHubspot.ts
// Submits support form data to HubSpot Forms API v3.
// Portal ID and form GUID are public-facing (safe in client code — same as the embed script).

const PORTAL_ID = '244822982'
const FORM_GUID = 'aa3482c3-cf8d-4ce8-8360-5cced50b1083'

export interface SupportFormData {
  firstName: string
  lastName:  string
  email:     string
  phone:     string
  issueType: string
  message:   string
}

interface HubSpotField {
  objectTypeId: '0-1'
  name:  string
  value: string
}

export interface SubmitResult {
  ok:     boolean
  error?: string
}

export async function submitSupportForm(data: SupportFormData): Promise<SubmitResult> {
  // Prepend issue type to message so the category is visible in HubSpot inbox
  const fullMessage = data.issueType
    ? `[${data.issueType}]\n\n${data.message}`
    : data.message

  const fields: HubSpotField[] = [
    { objectTypeId: '0-1', name: 'firstname', value: data.firstName },
    { objectTypeId: '0-1', name: 'lastname',  value: data.lastName },
    { objectTypeId: '0-1', name: 'email',     value: data.email },
    { objectTypeId: '0-1', name: 'phone',     value: data.phone },
    { objectTypeId: '0-1', name: 'message',   value: fullMessage },
  ]

  const payload = {
    fields,
    context: {
      pageUri:  window.location.href,
      pageName: 'VoiceIndia — Support',
    },
  }

  try {
    const res = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${FORM_GUID}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      }
    )

    if (!res.ok) {
      const text = await res.text().catch(() => String(res.status))
      console.error('[hubspot] Submission failed:', res.status, text)
      return { ok: false, error: 'Submission failed — please try again.' }
    }

    return { ok: true }
  } catch (err) {
    console.error('[hubspot] Network error:', err)
    return { ok: false, error: 'Network error — check your connection and try again.' }
  }
}
