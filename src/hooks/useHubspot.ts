// src/hooks/useHubspot.ts
// Submits support form data to HubSpot Forms API v3.
// The portal ID is public-facing (safe to embed in client code).
// The form GUID is set via VITE_HUBSPOT_FORM_ID env var.

const PORTAL_ID = '244822982'

interface SupportFormData {
  name: string
  email: string
  issueType: string
  message: string
}

interface HubSpotField {
  objectTypeId: '0-1'
  name: string
  value: string
}

export interface SubmitResult {
  ok: boolean
  error?: string
}

export async function submitSupportForm(data: SupportFormData): Promise<SubmitResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formGuid = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_HUBSPOT_FORM_ID

  if (!formGuid) {
    console.error('[hubspot] VITE_HUBSPOT_FORM_ID not set')
    return { ok: false, error: 'Support form is not configured yet — please contact us directly.' }
  }

  const [firstname, ...rest] = data.name.trim().split(' ')
  const lastname = rest.join(' ')

  const fields: HubSpotField[] = [
    { objectTypeId: '0-1', name: 'firstname',  value: firstname || data.name },
    { objectTypeId: '0-1', name: 'lastname',   value: lastname },
    { objectTypeId: '0-1', name: 'email',      value: data.email },
    { objectTypeId: '0-1', name: 'subject',    value: data.issueType },
    { objectTypeId: '0-1', name: 'message',    value: data.message },
  ]

  const payload = {
    fields,
    context: {
      pageUri: window.location.href,
      pageName: 'VoiceIndia — Support',
    },
  }

  try {
    const res = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${formGuid}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    if (!res.ok) {
      const text = await res.text().catch(() => res.status.toString())
      console.error('[hubspot] Submission failed:', res.status, text)
      return { ok: false, error: 'Submission failed — please try again.' }
    }

    return { ok: true }
  } catch (err) {
    console.error('[hubspot] Network error:', err)
    return { ok: false, error: 'Network error — check your connection and try again.' }
  }
}
