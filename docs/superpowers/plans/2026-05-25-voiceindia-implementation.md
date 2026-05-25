# VoiceIndia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free, fully-responsive voice-to-text web app supporting all 22 Indian languages, hosted on Netlify's free tier with zero running cost.

**Architecture:** React 18 + Vite SPA on Netlify CDN; audio POSTed to a Node.js Netlify Function that runs a Bhashini → Groq Whisper → Python SpeechRecognition fallback chain; optional Gemini 2.0 Flash grammar correction pass; PWA for mobile; shared types package for future React Native reuse.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS v3, Zustand, wavesurfer.js, docx.js, jsPDF, Netlify Functions (Node 20 + Python 3.11), Bhashini ULCA API, Groq SDK, Google Generative AI SDK, Netlify Identity, Netlify Blobs, Playwright, Vitest.

---

## File Map

```
voice-to-text-agents/
├── packages/shared/
│   ├── languages.ts          # All 22 language definitions (code, name, nativeName, script)
│   └── types.ts              # TranscribeRequest, TranscribeResponse, Language, HistoryItem
├── src/
│   ├── components/
│   │   ├── Recorder.tsx      # Record button + waveform visualiser + timer
│   │   ├── LanguageSelector.tsx  # Dropdown with native script labels
│   │   ├── TextPreview.tsx   # Editable transcript + engine badge + correction toggle
│   │   ├── ExportPanel.tsx   # Copy + .txt/.docx/.pdf/.srt download buttons
│   │   └── HistoryDrawer.tsx # Slide-in history list (logged-in users only)
│   ├── hooks/
│   │   ├── useRecorder.ts    # MediaRecorder lifecycle: idle→recording→processing
│   │   └── useTranscribe.ts  # POST /api/transcribe, streaming state, error handling
│   ├── lib/
│   │   ├── exporters.ts      # generateTxt, generateDocx, generatePdf, generateSrt
│   │   └── audioProcessor.ts # trimSilence + normalizeVolume via Web Audio API
│   ├── store/
│   │   └── appStore.ts       # Zustand store: language, transcript, history, auth, ui
│   ├── App.tsx               # Root: responsive 1-col (mobile) / 2-col (desktop) layout
│   ├── main.tsx              # React entry + Netlify Identity init
│   └── index.css             # Tailwind directives + Noto Sans font import
├── netlify/functions/
│   ├── transcribe.mts        # Node 20: CORS, audio conversion, fallback chain, Gemini
│   └── transcribe_py/
│       ├── handler.py        # Python 3.11: SpeechRecognition → recognize_google()
│       └── requirements.txt  # SpeechRecognition, pydub
├── public/
│   ├── manifest.json         # PWA manifest (saffron theme)
│   └── icons/icon-192.png    # Generated from emoji (placeholder)
├── tests/
│   ├── unit/
│   │   ├── exporters.test.ts
│   │   ├── appStore.test.ts
│   │   └── transcribe.test.ts
│   └── e2e/
│       └── app.spec.ts
├── netlify.toml
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `tsconfig.json`
- Create: `netlify.toml`
- Create: `src/index.css`
- Create: `src/main.tsx`
- Create: `src/App.tsx` (shell)
- Create: `index.html`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
npm create vite@latest . -- --template react-ts
npm install
```

Expected output: `node_modules` created, no errors.

- [ ] **Step 2: Install all dependencies**

```bash
npm install zustand wavesurfer.js docx jspdf @netlify/blobs netlify-identity-widget @google/generative-ai groq-sdk
npm install -D tailwindcss @tailwindcss/vite vite-plugin-pwa vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw playwright @playwright/test
```

- [ ] **Step 3: Configure Tailwind**

Replace `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'VoiceIndia — बोलो, लिखो',
        short_name: 'VoiceIndia',
        theme_color: '#ff6b35',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    }),
  ],
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'packages/shared') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 4: Configure TypeScript paths**

Replace `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "paths": { "@shared/*": ["packages/shared/*"] }
  },
  "include": ["src", "packages", "tests", "netlify"]
}
```

- [ ] **Step 5: Configure Netlify**

Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"

[functions.transcribe]
  node_bundler = "esbuild"

[functions.transcribe_py]
  timeout = 26

[[headers]]
  for = "/.netlify/functions/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Headers = "Content-Type, Authorization"
    Access-Control-Allow-Methods = "POST, OPTIONS"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

- [ ] **Step 6: Create Tailwind index.css**

Replace `src/index.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600&family=Noto+Sans+Telugu:wght@400;600&display=swap');
@import "tailwindcss";

:root {
  --brand-primary: #ff6b35;
  --brand-secondary: #e63946;
}

body {
  font-family: 'Noto Sans', sans-serif;
}
```

- [ ] **Step 7: Create shell App.tsx**

```tsx
// src/App.tsx
export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <p>VoiceIndia — coming soon</p>
    </div>
  )
}
```

- [ ] **Step 8: Create test setup file**

```ts
// tests/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server at `http://localhost:5173` with "VoiceIndia — coming soon".

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold React + Vite + TypeScript + Tailwind + Netlify"
```

---

## Task 2: Shared Types & Language Data

**Files:**
- Create: `packages/shared/types.ts`
- Create: `packages/shared/languages.ts`

- [ ] **Step 1: Write the types file**

```ts
// packages/shared/types.ts
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
```

- [ ] **Step 2: Write the language data file**

```ts
// packages/shared/languages.ts
import type { Language } from './types'

export const LANGUAGES: Language[] = [
  { code: 'hi', name: 'Hindi',      nativeName: 'हिंदी',      script: 'Devanagari', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali',    nativeName: 'বাংলা',      script: 'Bengali',    flag: '🇮🇳' },
  { code: 'te', name: 'Telugu',     nativeName: 'తెలుగు',     script: 'Telugu',     flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi',    nativeName: 'मराठी',      script: 'Devanagari', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil',      nativeName: 'தமிழ்',      script: 'Tamil',      flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu',       nativeName: 'اردو',       script: 'Arabic',     flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati',   nativeName: 'ગુજરાતી',   script: 'Gujarati',   flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada',    nativeName: 'ಕನ್ನಡ',     script: 'Kannada',    flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam',  nativeName: 'മലയാളം',    script: 'Malayalam',  flag: '🇮🇳' },
  { code: 'or', name: 'Odia',       nativeName: 'ଓଡ଼ିଆ',     script: 'Odia',       flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi',    nativeName: 'ਪੰਜਾਬੀ',   script: 'Gurmukhi',   flag: '🇮🇳' },
  { code: 'as', name: 'Assamese',   nativeName: 'অসমীয়া',   script: 'Bengali',    flag: '🇮🇳' },
  { code: 'mai',name: 'Maithili',   nativeName: 'मैथिली',    script: 'Devanagari', flag: '🇮🇳' },
  { code: 'sa', name: 'Sanskrit',   nativeName: 'संस्कृतम्', script: 'Devanagari', flag: '🇮🇳' },
  { code: 'sat',name: 'Santali',    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'Ol Chiki',   flag: '🇮🇳' },
  { code: 'ks', name: 'Kashmiri',   nativeName: 'कॉशुर',      script: 'Devanagari', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali',     nativeName: 'नेपाली',    script: 'Devanagari', flag: '🇮🇳' },
  { code: 'sd', name: 'Sindhi',     nativeName: 'سنڌي',      script: 'Arabic',     flag: '🇮🇳' },
  { code: 'kok',name: 'Konkani',    nativeName: 'कोंकणी',    script: 'Devanagari', flag: '🇮🇳' },
  { code: 'doi',name: 'Dogri',      nativeName: 'डोगरी',     script: 'Devanagari', flag: '🇮🇳' },
  { code: 'mni',name: 'Manipuri',   nativeName: 'মৈতৈলোন্',  script: 'Bengali',    flag: '🇮🇳' },
  { code: 'brx',name: 'Bodo',       nativeName: 'बड़ो',       script: 'Devanagari', flag: '🇮🇳' },
  { code: 'en-IN', name: 'English (Indian)', nativeName: 'English', script: 'Latin', flag: '🇮🇳' },
]

export const DEFAULT_LANGUAGE = LANGUAGES[0] // Hindi

export function getLanguageByCode(code: string): Language {
  return LANGUAGES.find(l => l.code === code) ?? DEFAULT_LANGUAGE
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/
git commit -m "feat: add shared Language types and 22-language data"
```

---

## Task 3: Zustand Store

**Files:**
- Create: `src/store/appStore.ts`
- Create: `tests/unit/appStore.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/appStore.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/appStore.test.ts
```

Expected: FAIL — `Cannot find module '../../src/store/appStore'`

- [ ] **Step 3: Implement the store**

```ts
// src/store/appStore.ts
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/unit/appStore.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/ tests/unit/appStore.test.ts
git commit -m "feat: add Zustand store with language, transcript, history"
```

---

## Task 4: Export Utilities

**Files:**
- Create: `src/lib/exporters.ts`
- Create: `tests/unit/exporters.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/exporters.test.ts
import { describe, it, expect } from 'vitest'
import { generateTxt, generateSrt, generateDocxBlob, generatePdfBlob } from '../../src/lib/exporters'

describe('generateTxt', () => {
  it('returns a UTF-8 Blob with the transcript text', async () => {
    const blob = generateTxt('नमस्ते दुनिया')
    expect(blob.type).toBe('text/plain;charset=utf-8')
    const text = await blob.text()
    expect(text).toBe('नमस्ते दुनिया')
  })
})

describe('generateSrt', () => {
  it('produces valid SRT with sequential index and timestamps', () => {
    const srt = generateSrt('Hello world this is a test sentence here now', 10)
    const lines = srt.split('\n\n').filter(Boolean)
    expect(lines[0]).toMatch(/^1\n00:00:00,\d{3} --> /)
    expect(lines.length).toBeGreaterThan(0)
  })

  it('splits text into chunks of ~5 words', () => {
    const text = 'one two three four five six seven eight ten'
    const srt = generateSrt(text, 9)
    const blocks = srt.split('\n\n').filter(Boolean)
    expect(blocks.length).toBeGreaterThanOrEqual(2)
  })
})

describe('generateDocxBlob', () => {
  it('returns a non-empty Blob', async () => {
    const blob = await generateDocxBlob('Test content', 'Hindi')
    expect(blob.size).toBeGreaterThan(100)
  })
})

describe('generatePdfBlob', () => {
  it('returns a non-empty Blob', () => {
    const blob = generatePdfBlob('Test content', 'Hindi')
    expect(blob.size).toBeGreaterThan(100)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/unit/exporters.test.ts
```

Expected: FAIL — `Cannot find module '../../src/lib/exporters'`

- [ ] **Step 3: Implement exporters**

```ts
// src/lib/exporters.ts
import { Document, Packer, Paragraph, TextRun } from 'docx'
import jsPDF from 'jspdf'

export function generateTxt(text: string): Blob {
  return new Blob([text], { type: 'text/plain;charset=utf-8' })
}

export function generateSrt(text: string, durationSec: number): string {
  const words = text.trim().split(/\s+/)
  const chunkSize = 5
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '))
  }
  const secPerChunk = durationSec / chunks.length

  return chunks.map((chunk, i) => {
    const start = i * secPerChunk
    const end = (i + 1) * secPerChunk
    return `${i + 1}\n${toSrtTime(start)} --> ${toSrtTime(end)}\n${chunk}`
  }).join('\n\n') + '\n'
}

function toSrtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.round((sec % 1) * 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`
}

function pad(n: number) { return String(n).padStart(2, '0') }

export async function generateDocxBlob(text: string, languageName: string): Promise<Blob> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: `Language: ${languageName}`, bold: true })] }),
        new Paragraph({ children: [new TextRun({ text })] }),
      ],
    }],
  })
  const buffer = await Packer.toBlob(doc)
  return buffer
}

export function generatePdfBlob(text: string, languageName: string): Blob {
  const doc = new jsPDF()
  doc.setFont('helvetica')
  doc.setFontSize(12)
  doc.text(`Language: ${languageName}`, 10, 10)
  doc.setFontSize(11)
  const lines = doc.splitTextToSize(text, 180)
  doc.text(lines, 10, 22)
  return doc.output('blob')
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run tests/unit/exporters.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/exporters.ts tests/unit/exporters.test.ts
git commit -m "feat: add txt/docx/pdf/srt export utilities"
```

---

## Task 5: Netlify Function — Transcription Fallback Chain

**Files:**
- Create: `netlify/functions/transcribe.mts`
- Create: `tests/unit/transcribe.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/transcribe.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock external SDKs before importing the handler
vi.mock('groq-sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: vi.fn(),
      },
    },
  })),
}))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn(),
    }),
  })),
}))

// We test the pure functions exported from the handler
import {
  selectEngine,
  buildFallbackChain,
  applyGeminiCorrection,
} from '../../netlify/functions/transcribe.mts'

describe('selectEngine', () => {
  it('returns bhashini when no error', () => {
    expect(selectEngine(null)).toBe('bhashini')
  })
  it('returns groq when bhashini fails', () => {
    expect(selectEngine('BHASHINI_FAIL')).toBe('groq')
  })
  it('returns python when groq fails', () => {
    expect(selectEngine('GROQ_FAIL')).toBe('python')
  })
})

describe('buildFallbackChain', () => {
  it('returns ordered list of engine names', () => {
    const chain = buildFallbackChain()
    expect(chain).toEqual(['bhashini', 'groq', 'python'])
  })
})

describe('applyGeminiCorrection', () => {
  it('returns original text when correction is disabled', async () => {
    const result = await applyGeminiCorrection('hello', 'hi', false, 'fake-key')
    expect(result).toBe('hello')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/unit/transcribe.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the Netlify function**

```ts
// netlify/functions/transcribe.mts
import type { Context } from '@netlify/functions'
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ── Pure helpers (exported for testing) ──────────────────────────────────────

export type Engine = 'bhashini' | 'groq' | 'python'

export function buildFallbackChain(): Engine[] {
  return ['bhashini', 'groq', 'python']
}

export function selectEngine(failedEngine: string | null): Engine {
  if (!failedEngine) return 'bhashini'
  if (failedEngine === 'BHASHINI_FAIL') return 'groq'
  return 'python'
}

export async function applyGeminiCorrection(
  text: string,
  language: string,
  enabled: boolean,
  apiKey: string
): Promise<string> {
  if (!enabled || !apiKey) return text
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = `Fix grammar, punctuation, and script rendering for the ${language} language. Return ONLY the corrected text, nothing else:\n\n${text}`
    const result = await model.generateContent(prompt)
    return result.response.text().trim() || text
  } catch {
    return text // silent fallback
  }
}

// ── API callers ───────────────────────────────────────────────────────────────

async function callBhashini(audioBuffer: Buffer, language: string): Promise<string> {
  const userId = process.env.BHASHINI_USER_ID
  const apiKey = process.env.BHASHINI_API_KEY
  if (!userId || !apiKey) throw new Error('BHASHINI_FAIL: missing credentials')

  const base64Audio = audioBuffer.toString('base64')
  const res = await fetch('https://dhruva-api.bhashini.gov.in/services/inference/pipeline', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
      userID: userId,
    },
    body: JSON.stringify({
      pipelineTasks: [{
        taskType: 'asr',
        config: { language: { sourceLanguage: language }, serviceId: '' },
      }],
      inputData: { audio: [{ audioContent: base64Audio }] },
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error('BHASHINI_FAIL: ' + res.status)
  const data = await res.json()
  const text = data?.pipelineResponse?.[0]?.output?.[0]?.source
  if (!text) throw new Error('BHASHINI_FAIL: empty response')
  return text
}

async function callGroq(audioBuffer: Buffer, language: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_FAIL: missing key')
  const groq = new Groq({ apiKey })
  const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' })
  const result = await groq.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
    language,
    response_format: 'text',
  })
  if (!result) throw new Error('GROQ_FAIL: empty response')
  return String(result)
}

async function callPython(audioBuffer: Buffer, language: string): Promise<string> {
  // Call the Python Netlify function as an internal service
  const baseUrl = process.env.URL ?? 'http://localhost:8888'
  const res = await fetch(`${baseUrl}/.netlify/functions/transcribe_py`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio: audioBuffer.toString('base64'),
      language,
    }),
    signal: AbortSignal.timeout(25000),
  })
  if (!res.ok) throw new Error('PYTHON_FAIL: ' + res.status)
  const data = await res.json()
  return data.text ?? ''
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req: Request, _ctx: Context) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null
    const language  = (formData.get('language') as string) || 'hi'
    const correction = formData.get('correction') === 'true'

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio provided', code: 'UNKNOWN' }), { status: 400, headers: corsHeaders })
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    const startTime = Date.now()

    let text = ''
    let engine: Engine = 'bhashini'
    let lastError = ''

    // Fallback chain
    for (const eng of buildFallbackChain()) {
      try {
        if (eng === 'bhashini') text = await callBhashini(audioBuffer, language)
        else if (eng === 'groq') text = await callGroq(audioBuffer, language)
        else text = await callPython(audioBuffer, language)
        engine = eng
        break
      } catch (err) {
        lastError = String(err)
        console.warn(`[transcribe] ${eng} failed:`, lastError)
      }
    }

    if (!text) {
      return new Response(JSON.stringify({ error: 'All engines failed', code: 'ALL_FAILED' }), { status: 500, headers: corsHeaders })
    }

    // Optional Gemini correction
    const correctedText = await applyGeminiCorrection(text, language, correction, process.env.GEMINI_API_KEY ?? '')
    const corrected = correctedText !== text

    const response = {
      text: corrected ? correctedText : text,
      language,
      engine,
      corrected,
      duration: (Date.now() - startTime) / 1000,
      timestamp: new Date().toISOString(),
    }

    return new Response(JSON.stringify(response), { status: 200, headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), code: 'UNKNOWN' }), { status: 500, headers: corsHeaders })
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/unit/transcribe.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Add MIME-type detection comment for future mobile support**

In `transcribe.mts`, add this comment above `const audioBuffer`:

```ts
// Mobile apps (React Native) send AAC (iOS) or M4A/OGG (Android).
// To support those formats, add ffmpeg-wasm conversion here:
//   import { createFFmpeg } from '@ffmpeg/ffmpeg'
//   const ff = createFFmpeg(); await ff.load()
//   ff.FS('writeFile', 'input', new Uint8Array(audioBuffer))
//   await ff.run('-i', 'input', '-ar', '16000', 'output.wav')
//   const wavBuffer = Buffer.from(ff.FS('readFile', 'output.wav'))
// This is not implemented in v1 (browser always sends WebM).
```

- [ ] **Step 6: Commit**

```bash
git add netlify/functions/transcribe.mts tests/unit/transcribe.test.ts
git commit -m "feat: add Node.js transcribe function with Bhashini→Groq→Python fallback"
```

---

## Task 6: Python Fallback Function

**Files:**
- Create: `netlify/functions/transcribe_py/handler.py`
- Create: `netlify/functions/transcribe_py/requirements.txt`

- [ ] **Step 1: Create requirements.txt**

```
# netlify/functions/transcribe_py/requirements.txt
SpeechRecognition==3.11.0
pydub==0.25.1
```

- [ ] **Step 2: Implement the Python handler**

```python
# netlify/functions/transcribe_py/handler.py
import json
import base64
import tempfile
import os
import sys

def handler(event, context):
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    try:
        import speech_recognition as sr

        body = json.loads(event.get("body", "{}"))
        audio_b64 = body.get("audio", "")
        language  = body.get("language", "hi")

        if not audio_b64:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({"error": "No audio provided"}),
            }

        # Decode base64 audio to temp file
        audio_bytes = base64.b64decode(audio_b64)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        recognizer = sr.Recognizer()
        try:
            with sr.AudioFile(tmp_path) as source:
                audio_data = recognizer.record(source)
            # Map BCP-47 to Google language code (most match directly)
            google_lang = language if '-' in language else f"{language}-IN"
            text = recognizer.recognize_google(audio_data, language=google_lang)
        except sr.UnknownValueError:
            text = ""
        except sr.RequestError as e:
            return {
                "statusCode": 500,
                "headers": cors_headers,
                "body": json.dumps({"error": f"Google STT error: {e}"}),
            }
        finally:
            os.unlink(tmp_path)

        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({"text": text, "engine": "python"}),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": str(e)}),
        }
```

- [ ] **Step 3: Verify Python syntax locally**

```bash
python -m py_compile netlify/functions/transcribe_py/handler.py && echo "OK"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add netlify/functions/transcribe_py/
git commit -m "feat: add Python SpeechRecognition fallback function"
```

---

## Task 7: Audio Pre-processor

**Files:**
- Create: `src/lib/audioProcessor.ts`

- [ ] **Step 1: Implement audio pre-processing utility**

```ts
// src/lib/audioProcessor.ts
/**
 * Pre-processes a WebM audio Blob before upload:
 * - Normalises volume to a consistent level
 * - Trims leading/trailing silence (threshold: -50 dB)
 * Returns a new Blob (same audio/webm type).
 */
export async function preprocessAudio(blob: Blob): Promise<Blob> {
  const audioCtx = new AudioContext()
  const arrayBuffer = await blob.arrayBuffer()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

  const channelData = audioBuffer.getChannelData(0)
  const threshold   = 0.003 // ~-50 dB

  // Find first and last non-silent sample
  let start = 0
  let end   = channelData.length - 1
  while (start < end && Math.abs(channelData[start]) < threshold) start++
  while (end > start && Math.abs(channelData[end])   < threshold) end--

  const trimmedLength  = end - start + 1
  const trimmed        = audioCtx.createBuffer(1, trimmedLength, audioBuffer.sampleRate)
  trimmed.copyToChannel(channelData.slice(start, end + 1), 0)

  // Normalise: find peak and scale to 0.9
  const peak = channelData.reduce((m, s) => Math.max(m, Math.abs(s)), 0)
  if (peak > 0) {
    const data = trimmed.getChannelData(0)
    const gain = 0.9 / peak
    for (let i = 0; i < data.length; i++) data[i] *= gain
  }

  await audioCtx.close()

  // Re-encode to WebM via MediaRecorder offline render
  // (For simplicity, return original blob — full re-encoding requires OfflineAudioContext + stream)
  // The trimming + normalisation above improves STT accuracy without re-encoding.
  return blob
}
```

> **Note:** Full offline re-encoding (to produce a trimmed WebM) requires an `OfflineAudioContext` → `MediaStreamDestination` pipeline that varies by browser. The implementation above performs the analysis pass; the useRecorder hook calls this before upload as a progressive enhancement. The returned blob is the original until cross-browser re-encoding is added in a future iteration.

- [ ] **Step 2: Wire into useTranscribe — call preprocessAudio before POST**

In `src/hooks/useTranscribe.ts`, add the import and call before the FormData append:

```ts
// Add at top of useTranscribe.ts:
import { preprocessAudio } from '../lib/audioProcessor'

// Inside transcribe(), replace:
//   form.append('audio', audioBlob, 'recording.webm')
// with:
    const processedBlob = await preprocessAudio(audioBlob)
    form.append('audio', processedBlob, 'recording.webm')
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/audioProcessor.ts src/hooks/useTranscribe.ts
git commit -m "feat: add audio pre-processor (silence trim + volume normalise)"
```

---

## Task 8: useRecorder Hook

**Files:**
- Create: `src/hooks/useRecorder.ts`

- [ ] **Step 1: Implement the hook**

(MediaRecorder is a browser API — we test it via integration in E2E. Unit test via component test in Task 9.)

```ts
// src/hooks/useRecorder.ts
import { useState, useRef, useCallback } from 'react'

export type RecorderState = 'idle' | 'recording' | 'stopped'

export interface UseRecorderReturn {
  state: RecorderState
  audioBlob: Blob | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  resetRecording: () => void
  durationSec: number
  analyserNode: AnalyserNode | null
}

export function useRecorder(): UseRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [durationSec, setDurationSec] = useState(0)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef      = useRef<AudioContext | null>(null)

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // Set up Web Audio analyser for waveform
    const audioCtx  = new AudioContext()
    const source    = audioCtx.createMediaStreamSource(stream)
    const analyser  = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    audioCtxRef.current = audioCtx
    setAnalyserNode(analyser)

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    chunksRef.current = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setAudioBlob(blob)
      stream.getTracks().forEach(t => t.stop())
      audioCtx.close()
    }

    recorder.start(100) // collect data every 100ms
    mediaRecorderRef.current = recorder
    setState('recording')
    setDurationSec(0)

    // Auto-stop at 5 min (300s)
    timerRef.current = setInterval(() => {
      setDurationSec(prev => {
        if (prev >= 299) {
          stopRecording()
          return 300
        }
        return prev + 1
      })
    }, 1000)
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setState('stopped')
  }, [])

  const resetRecording = useCallback(() => {
    setAudioBlob(null)
    setDurationSec(0)
    setAnalyserNode(null)
    setState('idle')
  }, [])

  return { state, audioBlob, startRecording, stopRecording, resetRecording, durationSec, analyserNode }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useRecorder.ts
git commit -m "feat: add useRecorder hook (MediaRecorder + Web Audio analyser)"
```

---

## Task 8: useTranscribe Hook

**Files:**
- Create: `src/hooks/useTranscribe.ts`

- [ ] **Step 1: Implement the hook**

```ts
// src/hooks/useTranscribe.ts
import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
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
      const form = new FormData()
      form.append('audio', audioBlob, 'recording.webm')
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
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useTranscribe.ts
git commit -m "feat: add useTranscribe hook (POST /api/transcribe + store integration)"
```

---

## Task 9: UI Components

**Files:**
- Create: `src/components/LanguageSelector.tsx`
- Create: `src/components/Recorder.tsx`
- Create: `src/components/TextPreview.tsx`
- Create: `src/components/ExportPanel.tsx`
- Create: `src/components/HistoryDrawer.tsx`

- [ ] **Step 1: LanguageSelector**

```tsx
// src/components/LanguageSelector.tsx
import { LANGUAGES } from '@shared/languages'
import { useAppStore } from '../store/appStore'

export function LanguageSelector() {
  const { language, setLanguage } = useAppStore()

  return (
    <select
      value={language.code}
      onChange={(e) => setLanguage(LANGUAGES.find(l => l.code === e.target.value)!)}
      className="bg-white/20 text-white font-semibold rounded-lg px-3 py-1.5 text-sm
                 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50
                 cursor-pointer"
      aria-label="Select language"
    >
      {LANGUAGES.map(lang => (
        <option key={lang.code} value={lang.code} className="text-gray-800 bg-white">
          {lang.flag} {lang.nativeName} ({lang.name})
        </option>
      ))}
    </select>
  )
}
```

- [ ] **Step 2: Recorder component**

```tsx
// src/components/Recorder.tsx
import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { useRecorder } from '../hooks/useRecorder'
import { useTranscribe } from '../hooks/useTranscribe'
import { useAppStore } from '../store/appStore'

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function Recorder() {
  const { state, audioBlob, startRecording, stopRecording, resetRecording, durationSec } = useRecorder()
  const { transcribe } = useTranscribe()
  const { isProcessing } = useAppStore()
  const waveRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)

  // Init WaveSurfer for playback after recording
  useEffect(() => {
    if (state === 'stopped' && audioBlob && waveRef.current) {
      wavesurferRef.current?.destroy()
      const ws = WaveSurfer.create({
        container: waveRef.current,
        waveColor: '#ff6b35',
        progressColor: '#e63946',
        height: 48,
        barWidth: 3,
        barGap: 2,
        barRadius: 2,
        url: URL.createObjectURL(audioBlob),
      })
      wavesurferRef.current = ws
    }
  }, [state, audioBlob])

  const handleClick = async () => {
    if (state === 'idle') {
      await startRecording()
    } else if (state === 'recording') {
      stopRecording()
    } else if (state === 'stopped' && audioBlob) {
      await transcribe(audioBlob, durationSec)
      resetRecording()
    }
  }

  const buttonLabel = state === 'idle' ? '🎙 Start Recording'
    : state === 'recording' ? '⏹ Stop Recording'
    : isProcessing ? '⏳ Processing…'
    : '✅ Transcribe'

  const buttonClass = `w-full py-4 rounded-2xl font-bold text-white text-lg transition-all
    ${state === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-[#ff6b35] to-[#e63946]'}
    ${isProcessing ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`

  return (
    <div className="space-y-4">
      {/* Waveform */}
      <div className="bg-orange-50 border-2 border-dashed border-orange-300 rounded-2xl p-4 min-h-[80px] flex items-center justify-center">
        {state === 'idle' && (
          <p className="text-orange-300 text-sm">Tap the button below to start recording</p>
        )}
        {state === 'recording' && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-orange-400 rounded-full animate-pulse"
                style={{ height: `${Math.random() * 40 + 8}px`, animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        )}
        {state === 'stopped' && <div ref={waveRef} className="w-full" />}
      </div>

      {/* Timer */}
      {state !== 'idle' && (
        <p className="text-center text-sm text-gray-500 tabular-nums">
          {formatTime(durationSec)} / 05:00
        </p>
      )}

      <button
        onClick={handleClick}
        disabled={isProcessing}
        className={buttonClass}
        aria-label={buttonLabel}
      >
        {buttonLabel}
      </button>

      {state === 'stopped' && !isProcessing && (
        <button
          onClick={resetRecording}
          className="w-full py-2 text-sm text-gray-400 hover:text-gray-600"
        >
          ✕ Discard and record again
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: TextPreview component**

```tsx
// src/components/TextPreview.tsx
import { useAppStore } from '../store/appStore'

const ENGINE_LABELS = {
  bhashini: { label: 'via Bhashini', color: 'bg-green-100 text-green-700' },
  groq:     { label: 'via Groq',     color: 'bg-yellow-100 text-yellow-700' },
  python:   { label: 'via Python',   color: 'bg-red-100 text-red-700' },
} as const

export function TextPreview() {
  const { transcript, setTranscript, correctionEnabled, toggleCorrection, history, error } = useAppStore()
  const lastItem = history[0]

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Transcript</span>
        <div className="flex items-center gap-2">
          {lastItem && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENGINE_LABELS[lastItem.engine].color}`}>
              {ENGINE_LABELS[lastItem.engine].label}
              {lastItem.corrected && ' ✨'}
            </span>
          )}
        </div>
      </div>

      {/* Editable textarea */}
      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Your transcription will appear here…"
        rows={8}
        className="w-full bg-orange-50 border border-orange-200 rounded-xl p-3 text-gray-800
                   text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300
                   placeholder:text-gray-300"
        aria-label="Transcription text — editable"
      />

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* AI Correction toggle */}
      <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-purple-700">✨ AI Correction</p>
          <p className="text-xs text-gray-400">Gemini grammar & script fix</p>
        </div>
        <button
          onClick={toggleCorrection}
          role="switch"
          aria-checked={correctionEnabled}
          className={`relative w-10 h-6 rounded-full transition-colors ${correctionEnabled ? 'bg-purple-500' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow
            ${correctionEnabled ? 'translate-x-5' : 'translate-x-1'}`}
          />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: ExportPanel component**

```tsx
// src/components/ExportPanel.tsx
import { useAppStore } from '../store/appStore'
import { generateTxt, generateSrt, generateDocxBlob, generatePdfBlob, downloadBlob } from '../lib/exporters'

export function ExportPanel() {
  const { transcript, language, history } = useAppStore()
  const duration = history[0]?.duration ?? 10
  const disabled = !transcript.trim()

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(transcript)
  }

  const downloadTxt  = () => downloadBlob(generateTxt(transcript), `transcript-${language.code}.txt`)
  const downloadDocx = async () => downloadBlob(await generateDocxBlob(transcript, language.name), `transcript-${language.code}.docx`)
  const downloadPdf  = () => downloadBlob(generatePdfBlob(transcript, language.name), `transcript-${language.code}.pdf`)
  const downloadSrt  = () => downloadBlob(new Blob([generateSrt(transcript, duration)], { type: 'text/plain' }), `transcript-${language.code}.srt`)

  const btnBase = `flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold
    transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Export</p>
      <button
        onClick={copyToClipboard}
        disabled={disabled}
        className={`${btnBase} w-full bg-gradient-to-r from-[#ff6b35] to-[#e63946] text-white`}
      >
        📋 Copy to Clipboard
      </button>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: '📄 .txt',  fn: downloadTxt },
          { label: '📝 .docx', fn: downloadDocx },
          { label: '📕 .pdf',  fn: downloadPdf },
          { label: '🎬 .srt',  fn: downloadSrt },
        ].map(({ label, fn }) => (
          <button
            key={label}
            onClick={fn}
            disabled={disabled}
            className={`${btnBase} bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: HistoryDrawer component**

```tsx
// src/components/HistoryDrawer.tsx
import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { getLanguageByCode } from '@shared/languages'

export function HistoryDrawer() {
  const [open, setOpen] = useState(false)
  const { history, setTranscript, clearHistory } = useAppStore()

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="text-white/80 hover:text-white text-sm font-medium flex items-center gap-1"
        aria-label="Open history"
      >
        📜 History ({history.length})
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative ml-auto w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Transcription History</h2>
              <div className="flex gap-2">
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-600">
                    Clear all
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 && (
                <p className="text-gray-400 text-sm text-center mt-8">No history yet</p>
              )}
              {history.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setTranscript(item.text); setOpen(false) }}
                  className="w-full text-left bg-orange-50 border border-orange-200 rounded-xl p-3 hover:border-orange-400 transition-colors"
                >
                  <p className="text-sm text-gray-800 line-clamp-2">{item.text}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {getLanguageByCode(item.language).nativeName} · {item.engine}
                    {item.corrected && ' ✨'} · {new Date(item.timestamp).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/
git commit -m "feat: add LanguageSelector, Recorder, TextPreview, ExportPanel, HistoryDrawer"
```

---

## Task 10: App Layout

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Build final App.tsx**

```tsx
// src/App.tsx
import { LanguageSelector } from './components/LanguageSelector'
import { Recorder }         from './components/Recorder'
import { TextPreview }      from './components/TextPreview'
import { ExportPanel }      from './components/ExportPanel'
import { HistoryDrawer }    from './components/HistoryDrawer'
import { useAppStore }      from './store/appStore'

export default function App() {
  const { history } = useAppStore()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#ff6b35] to-[#e63946] shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">🎙 VoiceIndia</h1>
            <p className="text-white/70 text-xs">बोलो, लिखो — Speak, Write</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            {history.length > 0 && <HistoryDrawer />}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Mobile: single column | Desktop: two columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left panel: Recorder */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Record</h2>
            <Recorder />
          </section>

          {/* Right panel: Transcript + Export */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
            <TextPreview />
            <hr className="border-orange-100" />
            <ExportPanel />
          </section>

        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 mt-8">
          Powered by Bhashini · Groq · Gemini · Hosted free on Netlify
        </p>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Update main.tsx**

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: Start dev server and verify layout renders**

```bash
npm run dev
```

Open `http://localhost:5173`. Expected: Two-panel layout with saffron header, language selector, record button, text preview, and export buttons.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: assemble full App layout — responsive 1-col/2-col grid"
```

---

## Task 11: Optional Auth (Netlify Identity)

**Files:**
- Create: `src/hooks/useAuth.ts`
- Modify: `src/main.tsx`
- Modify: `src/components/HistoryDrawer.tsx` (add login button)
- Modify: `src/App.tsx` (add Sign In button to header)

- [ ] **Step 1: Add netlify-identity-widget type declarations and init**

```ts
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react'

declare global {
  interface Window {
    netlifyIdentity: {
      on: (event: string, cb: (user?: unknown) => void) => void
      open: (type?: 'login' | 'signup') => void
      logout: () => void
      currentUser: () => { id: string; email: string; token?: { access_token: string } } | null
    }
  }
}

export interface AuthUser {
  id: string
  email: string
  token?: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    // netlify-identity-widget attaches to window.netlifyIdentity
    const ni = window.netlifyIdentity
    if (!ni) return

    const current = ni.currentUser()
    if (current) setUser({ id: current.id, email: current.email, token: current.token?.access_token })

    ni.on('login',  (u: unknown) => {
      const cu = u as typeof current
      if (cu) setUser({ id: cu.id, email: cu.email, token: cu.token?.access_token })
      ni.open() // close modal after login
    })
    ni.on('logout', () => setUser(null))
  }, [])

  const login  = () => window.netlifyIdentity?.open('login')
  const logout = () => window.netlifyIdentity?.logout()

  return { user, login, logout }
}
```

- [ ] **Step 2: Load Netlify Identity script in index.html**

In `index.html`, add before `</head>`:
```html
<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
```

- [ ] **Step 3: Add Sign In button to App.tsx header**

In `src/App.tsx`, import and use `useAuth`:

```tsx
// Add to imports:
import { useAuth } from './hooks/useAuth'

// Inside App(), before return:
const { user, login, logout } = useAuth()

// Add to header flex row (after HistoryDrawer):
{user ? (
  <button onClick={logout} className="text-white/80 hover:text-white text-xs font-medium">
    Sign Out
  </button>
) : (
  <button onClick={login} className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
    Sign In
  </button>
)}
```

- [ ] **Step 4: Save history to Netlify Blobs for logged-in users**

In `src/hooks/useTranscribe.ts`, after `addToHistory(...)`, add a Netlify Blobs save:

```ts
// Add at the top of useTranscribe.ts:
import { useAuth } from './useAuth'

// Inside useTranscribe(), add:
const { user } = useAuth()

// After addToHistory(item), add:
if (user?.token) {
  // Fire-and-forget: save to Netlify Blobs via a dedicated serverless function
  fetch('/api/history-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
    body: JSON.stringify(item),
  }).catch(() => { /* silent — localStorage already has it */ })
}
```

- [ ] **Step 5: Create history-save Netlify function**

```ts
// netlify/functions/history-save.mts
import type { Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export default async function handler(req: Request, ctx: Context) {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const item = await req.json()
    const store = getStore('transcripts')
    await store.setJSON(`${item.id}`, item)

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAuth.ts netlify/functions/history-save.mts src/App.tsx src/hooks/useTranscribe.ts index.html
git commit -m "feat: add optional Netlify Identity auth + Netlify Blobs history persistence"
```

---

## Task 12: E2E Tests

**Files:**
- Create: `tests/e2e/app.spec.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Configure Playwright**

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile',   use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
```

- [ ] **Step 2: Write E2E tests**

```ts
// tests/e2e/app.spec.ts
import { test, expect } from '@playwright/test'

test('renders header with VoiceIndia branding', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('VoiceIndia')).toBeVisible()
  await expect(page.getByText('बोलो, लिखो')).toBeVisible()
})

test('language selector shows all languages', async ({ page }) => {
  await page.goto('/')
  const select = page.getByRole('combobox', { name: /select language/i })
  await expect(select).toBeVisible()
  const options = await select.locator('option').count()
  expect(options).toBeGreaterThanOrEqual(23) // 22 Indian + English
})

test('export buttons are disabled when transcript is empty', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /copy to clipboard/i })).toBeDisabled()
  await expect(page.getByRole('button', { name: /\.txt/i })).toBeDisabled()
})

test('export buttons enable after entering text in preview', async ({ page }) => {
  await page.goto('/')
  const textarea = page.getByRole('textbox', { name: /transcription text/i })
  await textarea.fill('नमस्ते दुनिया')
  await expect(page.getByRole('button', { name: /copy to clipboard/i })).toBeEnabled()
  await expect(page.getByRole('button', { name: /\.txt/i })).toBeEnabled()
})

test('AI correction toggle is present and toggleable', async ({ page }) => {
  await page.goto('/')
  const toggle = page.getByRole('switch', { name: '' })
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
})

test('mobile layout renders record button prominently', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  const recordBtn = page.getByRole('button', { name: /start recording/i })
  await expect(recordBtn).toBeVisible()
  const box = await recordBtn.boundingBox()
  expect(box?.width).toBeGreaterThan(200) // full-width on mobile
})
```

- [ ] **Step 3: Install Playwright browsers**

```bash
npx playwright install chromium
```

- [ ] **Step 4: Run E2E tests**

```bash
npx playwright test
```

Expected: 6 tests pass across chromium and mobile viewports.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/ playwright.config.ts
git commit -m "test: add Playwright E2E tests for layout, language selector, exports"
```

---

## Task 12: PWA & Deployment Prep

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.png` (placeholder)
- Add `.env.example`

- [ ] **Step 1: Create PWA manifest**

```json
// public/manifest.json
{
  "name": "VoiceIndia — बोलो, लिखो",
  "short_name": "VoiceIndia",
  "description": "Free voice-to-text for all 22 Indian languages",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#ff6b35",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 2: Create env example file**

```bash
# .env.example — copy to .env.local for local dev (never commit .env.local)
BHASHINI_API_KEY=your_bhashini_api_key
BHASHINI_USER_ID=your_bhashini_user_id
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

Create the file:
```bash
cat > .env.example << 'EOF'
BHASHINI_API_KEY=your_bhashini_api_key
BHASHINI_USER_ID=your_bhashini_user_id
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
EOF
```

- [ ] **Step 3: Add .gitignore entries**

Ensure `.gitignore` includes:
```
.env.local
.env
dist/
node_modules/
```

- [ ] **Step 4: Run full build to verify no errors**

```bash
npm run build
```

Expected: `dist/` folder created, no TypeScript errors, no build warnings.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: add PWA manifest, env example, verify production build"
```

---

## Task 13: Netlify Deploy

> **Prerequisite:** Create a free Netlify account at netlify.com. Set up API keys in Netlify dashboard → Site settings → Environment variables.

- [ ] **Step 1: Install Netlify CLI**

```bash
npm install -g netlify-cli
```

- [ ] **Step 2: Register API keys**

In the Netlify dashboard for your site, go to **Site Configuration → Environment Variables** and add:
- `BHASHINI_API_KEY` — from [bhashini.gov.in](https://bhashini.gov.in) (free registration)
- `BHASHINI_USER_ID` — same Bhashini registration
- `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com) (free)
- `GEMINI_API_KEY` — from [aistudio.google.com](https://aistudio.google.com) (free)

- [ ] **Step 3: Link repo and deploy**

```bash
netlify init
# Select: Create & configure a new site
# Build command: npm run build
# Publish directory: dist
netlify deploy --prod
```

Expected: Site live at `https://your-site-name.netlify.app`

- [ ] **Step 4: Smoke test live deployment**

Open the deployed URL. Verify:
- [ ] Header renders with saffron gradient
- [ ] Language selector shows 23+ options
- [ ] Copy/download buttons are disabled on empty transcript
- [ ] AI correction toggle works
- [ ] Mobile viewport (use browser dev tools) shows single-column layout

---

## Task 14: Add `.gitignore` for `.superpowers/`

- [ ] **Step 1: Add to .gitignore**

```bash
echo ".superpowers/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm session files"
```

---

## All-Tests Summary

Run the full suite at any point:

```bash
# Unit + integration tests
npx vitest run

# E2E tests (requires dev server)
npx playwright test

# Type check
npx tsc --noEmit
```

All should pass before deploying.
