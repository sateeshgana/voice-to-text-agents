// src/components/SupportForm.tsx
import { useState, useEffect, useRef } from 'react'
import { submitSupportForm } from '../hooks/useHubspot'

interface Props {
  open: boolean
  onClose: () => void
}

const ISSUE_TYPES = [
  'Audio recording issue',
  'Transcription quality',
  'Wrong language detected',
  'Export / download problem',
  'App not loading',
  'Feature request',
  'Other',
]

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export function SupportForm({ open, onClose }: Props) {
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0])
  const [message,   setMessage]   = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMsg,  setErrorMsg]  = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  // Focus first field when modal opens; reset on close
  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 80)
    } else {
      // reset after close animation
      setTimeout(() => {
        setName(''); setEmail(''); setIssueType(ISSUE_TYPES[0])
        setMessage(''); setFormState('idle'); setErrorMsg('')
      }, 300)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState('submitting')
    setErrorMsg('')

    const result = await submitSupportForm({ name, email, issueType, message })

    if (result.ok) {
      setFormState('success')
    } else {
      setFormState('error')
      setErrorMsg(result.error ?? 'Something went wrong — please try again.')
    }
  }

  if (!open) return null

  const inputClass = `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2
    focus:ring-orange-300 border-gray-200 bg-white transition`

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-form-title"
    >
      {/* Dimmed overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#ff6b35] to-[#e63946] px-5 py-4 flex items-center justify-between">
          <div>
            <h2 id="support-form-title" className="text-white font-bold text-lg">🛟 Help &amp; Support</h2>
            <p className="text-white/70 text-xs">We usually respond within 24 hours</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl leading-none p-1"
            aria-label="Close support form"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">

          {/* Success state */}
          {formState === 'success' ? (
            <div className="text-center py-6 space-y-3">
              <div className="text-5xl">✅</div>
              <h3 className="font-bold text-gray-800 text-lg">Message sent!</h3>
              <p className="text-sm text-gray-500">
                Thanks for reaching out. We'll get back to you at <strong>{email}</strong> soon.
              </p>
              <button
                onClick={onClose}
                className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#e63946]
                  text-white font-semibold text-sm active:scale-95 transition"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Your Name *</label>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Priya Sharma"
                  required
                  className={inputClass}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="priya@example.com"
                  required
                  className={inputClass}
                />
              </div>

              {/* Issue type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Issue Type</label>
                <select
                  value={issueType}
                  onChange={e => setIssueType(e.target.value)}
                  className={inputClass}
                >
                  {ISSUE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Message *</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your issue or question in detail…"
                  required
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Error */}
              {formState === 'error' && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={formState === 'submitting' || !name.trim() || !email.trim() || !message.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#e63946]
                  text-white font-bold text-sm active:scale-95 transition
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formState === 'submitting' ? '⏳ Sending…' : '📨 Send Message'}
              </button>

            </form>
          )}
        </div>
      </div>
    </div>
  )
}
