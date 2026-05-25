export interface Language {
  code: string        // BCP-47 e.g. "hi"
  name: string        // English name e.g. "Hindi"
  nativeName: string  // e.g. "हिंदी"
  script: string      // Unicode script name e.g. "Devanagari"
  flag: string        // emoji e.g. "🇮🇳"
}

export interface TranscribeRequest {
  language: string    // BCP-47 code
  correction: boolean // run Gemini correction pass
  userId?: string     // Netlify Identity JWT (optional)
}

export interface TranscribeResponse {
  text: string
  language: string
  engine: 'bhashini' | 'groq' | 'python'
  corrected: boolean
  duration: number    // seconds
  timestamp: string   // ISO-8601
}

export interface TranscribeError {
  error: string
  code: 'NO_MIC' | 'TOO_SHORT' | 'ALL_FAILED' | 'OFFLINE' | 'UNKNOWN'
}

export interface HistoryItem {
  id: string
  text: string
  language: string
  engine: 'bhashini' | 'groq' | 'python'
  corrected: boolean
  duration: number
  timestamp: string
}
