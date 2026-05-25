import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language, HistoryItem } from '@shared/types'
import { DEFAULT_LANGUAGE } from '@shared/languages'

interface AppState {
  language: Language
  transcript: string
  history: HistoryItem[]
  isRecording: boolean
  isProcessing: boolean
  correctionEnabled: boolean
  error: string | null
  // actions
  setLanguage: (lang: Language) => void
  setTranscript: (text: string) => void
  addToHistory: (item: HistoryItem) => void
  clearHistory: () => void
  setRecording: (v: boolean) => void
  setProcessing: (v: boolean) => void
  toggleCorrection: () => void
  setError: (msg: string | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      transcript: '',
      history: [],
      isRecording: false,
      isProcessing: false,
      correctionEnabled: false,
      error: null,
      setLanguage: (language) => set({ language }),
      setTranscript: (transcript) => set({ transcript }),
      addToHistory: (item) =>
        set((s) => ({ history: [item, ...s.history].slice(0, 20) })),
      clearHistory: () => set({ history: [] }),
      setRecording: (isRecording) => set({ isRecording }),
      setProcessing: (isProcessing) => set({ isProcessing }),
      toggleCorrection: () => set((s) => ({ correctionEnabled: !s.correctionEnabled })),
      setError: (error) => set({ error }),
    }),
    {
      name: 'voiceindia-store',
      partialize: (s) => ({ language: s.language, history: s.history, correctionEnabled: s.correctionEnabled }),
    }
  )
)
