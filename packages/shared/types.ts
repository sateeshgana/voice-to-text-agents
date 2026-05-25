export interface Language {
  code: string        // BCP-47 e.g. "hi"
  name: string        // English name e.g. "Hindi"
  nativeName: string  // e.g. "हिंदी"
  script: string      // Unicode script name e.g. "Devanagari"
  flag: string        // emoji e.g. "🇮🇳"
  tagline: string     // "Speak, Write" in that language e.g. "बोलो, लिखो"
  rtl?: boolean       // true for right-to-left scripts (Urdu, Kashmiri, Sindhi)
}

export type LanguageCode = 'hi' | 'bn' | 'te' | 'mr' | 'ta' | 'ur' | 'gu' | 'kn' | 'ml' | 'or' | 'pa' | 'as' | 'mai' | 'sa' | 'sat' | 'ks' | 'ne' | 'sd' | 'kok' | 'doi' | 'mni' | 'brx' | 'en-IN'

export interface TranscribeRequest {
  language: LanguageCode // BCP-47 code
  correction: boolean    // run AI correction pass
  userId?: string        // Netlify Identity JWT (optional)
}

export interface TranscribeResponse {
  text: string
  language: LanguageCode
  engine: 'groq' | 'python'
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
  language: LanguageCode
  engine: 'groq' | 'python'
  corrected: boolean
  duration: number
  timestamp: string
}
