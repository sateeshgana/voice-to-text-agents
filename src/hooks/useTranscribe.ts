// src/hooks/useTranscribe.ts
import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { preprocessAudio } from '../lib/audioProcessor'
import type { TranscribeResponse, TranscribeError } from '@shared/types'
import { useAuth } from './useAuth'

declare global {
  interface Window {
    grecaptcha: {
      execute: (siteKey: string, options: { action: string }) => Promise<string>
      ready: (cb: () => void) => void
    }
  }
}

// ── reCAPTCHA setup ───────────────────────────────────────────────────────────
// Site key is fetched from /api/config (reads process.env.recapcha_key server-side).
// Cached after first fetch; script injected into <head> once.

let recaptchaSiteKey = ''
let recaptchaScriptLoaded = false

async function loadRecaptcha(): Promise<void> {
  if (recaptchaScriptLoaded) return
  try {
    const res = await fetch('/api/config')
    if (!res.ok) return
    const data = await res.json() as { recaptchaSiteKey?: string }
    recaptchaSiteKey = data.recaptchaSiteKey ?? ''
    if (!recaptchaSiteKey) return

    // Inject the reCAPTCHA script once
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`
    script.async = true
    document.head.appendChild(script)
    recaptchaScriptLoaded = true
  } catch {
    // reCAPTCHA unavailable — proceed without token (server will accept it)
  }
}

// Load reCAPTCHA as soon as this module is imported
loadRecaptcha()

async function getRecaptchaToken(): Promise<string> {
  if (!recaptchaSiteKey || !window.grecaptcha) return ''
  return new Promise<string>((resolve) => {
    window.grecaptcha.ready(async () => {
      try {
        const token = await window.grecaptcha.execute(recaptchaSiteKey, { action: 'transcribe' })
        resolve(token)
      } catch {
        resolve('')
      }
    })
  })
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTranscribe() {
  const { setTranscript, setProcessing, setError, addToHistory, correctionEnabled, language } = useAppStore()
  const { user } = useAuth()

  const transcribe = useCallback(async (audioBlob: Blob, durationSec: number) => {
    if (!navigator.onLine) {
      setError("You're offline — connect and retry")
      return
    }
    if (durationSec < 1) {
      setError('Recording too short — try again')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const processedBlob = await preprocessAudio(audioBlob)

      // reCAPTCHA v3 — execute before building the request
      const recaptchaToken = await getRecaptchaToken()

      const form = new FormData()
      form.append('audio', processedBlob, 'recording.webm')
      form.append('language', language.code)
      form.append('correction', String(correctionEnabled))
      if (recaptchaToken) form.append('recaptcha_token', recaptchaToken)

      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      const data = await res.json() as TranscribeResponse | TranscribeError

      if (!res.ok || 'code' in data) {
        setError((data as TranscribeError).error ?? 'Transcription failed — please try again')
        return
      }

      const result = data as TranscribeResponse
      setTranscript(result.text)
      addToHistory({
        id: crypto.randomUUID(),
        text: result.text,
        language: result.language,
        engine: result.engine,
        corrected: result.corrected,
        duration: result.duration,
        timestamp: result.timestamp,
      })
      // Fire-and-forget: save to Netlify Blobs for logged-in users
      if (user?.token) {
        fetch('/api/history-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            text: result.text,
            language: result.language,
            engine: result.engine,
            corrected: result.corrected,
            duration: result.duration,
            timestamp: result.timestamp,
          }),
        }).catch(() => { /* silent — localStorage already has it */ })
      }
    } catch {
      setError('Transcription failed — please try again')
    } finally {
      setProcessing(false)
    }
  }, [language, correctionEnabled, setTranscript, setProcessing, setError, addToHistory, user])

  return { transcribe }
}
