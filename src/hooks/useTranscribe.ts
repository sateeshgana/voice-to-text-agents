// src/hooks/useTranscribe.ts
import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { preprocessAudio } from '../lib/audioProcessor'
import type { TranscribeResponse, TranscribeError } from '@shared/types'

export function useTranscribe() {
  const { setTranscript, setProcessing, setError, addToHistory, correctionEnabled, language } = useAppStore()

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

      const form = new FormData()
      form.append('audio', processedBlob, 'recording.webm')
      form.append('language', language.code)
      form.append('correction', String(correctionEnabled))

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
    } catch {
      setError('Transcription failed — please try again')
    } finally {
      setProcessing(false)
    }
  }, [language, correctionEnabled, setTranscript, setProcessing, setError, addToHistory])

  return { transcribe }
}
