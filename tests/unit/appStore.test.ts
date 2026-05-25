import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../../src/store/appStore'
import { DEFAULT_LANGUAGE } from '@shared/languages'
import type { HistoryItem } from '@shared/types'

beforeEach(() => {
  useAppStore.setState({
    language: DEFAULT_LANGUAGE,
    transcript: '',
    history: [],
    isRecording: false,
    isProcessing: false,
    correctionEnabled: false,
    error: null,
  })
})

describe('setLanguage', () => {
  it('updates the active language', () => {
    const { setLanguage } = useAppStore.getState()
    setLanguage({ code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil', flag: '🇮🇳' })
    expect(useAppStore.getState().language.code).toBe('ta')
  })
})

describe('setTranscript', () => {
  it('stores transcription text', () => {
    const { setTranscript } = useAppStore.getState()
    setTranscript('नमस्ते')
    expect(useAppStore.getState().transcript).toBe('नमस्ते')
  })
})

describe('addToHistory', () => {
  it('prepends new item to history', () => {
    const { addToHistory } = useAppStore.getState()
    const item: HistoryItem = {
      id: '1', text: 'hello', language: 'en-IN', engine: 'bhashini',
      corrected: false, duration: 3, timestamp: new Date().toISOString()
    }
    addToHistory(item)
    expect(useAppStore.getState().history[0].id).toBe('1')
  })

  it('keeps max 20 items', () => {
    const { addToHistory } = useAppStore.getState()
    for (let i = 0; i < 22; i++) {
      addToHistory({ id: String(i), text: 'x', language: 'hi', engine: 'groq', corrected: false, duration: 1, timestamp: '' })
    }
    expect(useAppStore.getState().history.length).toBe(20)
  })
})

describe('toggleCorrection', () => {
  it('flips correctionEnabled', () => {
    const { toggleCorrection } = useAppStore.getState()
    expect(useAppStore.getState().correctionEnabled).toBe(false)
    toggleCorrection()
    expect(useAppStore.getState().correctionEnabled).toBe(true)
  })
})
