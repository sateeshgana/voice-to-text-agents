# VoiceIndia — Voice-to-Text for Indian Languages
**Design Spec** | 2026-05-25

---

## 1. Overview

A free, public-facing web application that lets any user record their voice, select an Indian language, and get an accurate text transcript they can copy or download. Hosted entirely on Netlify's free tier — zero running cost.

**Tagline:** बोलो, लिखो — *Speak, Write*

---

## 2. Goals

- Support all 22 scheduled Indian languages + Indian-accent English
- Zero cost to operate (Netlify free, free-tier APIs only)
- Works for anonymous users with no signup friction
- Highest possible accuracy for Indian languages via Bhashini + AI correction
- Fully responsive — equal quality on mobile and desktop

---

## 3. Tech Stack

### Frontend
| Tool | Choice |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| State management | Zustand |
| Audio capture | MediaRecorder API (WebM/Opus) |
| Waveform visualisation | wavesurfer.js |
| Export: Word | docx.js |
| Export: PDF | jsPDF |

### Backend (Netlify Functions)
| Tool | Choice |
|---|---|
| JS function runtime | Node.js 20 (ESM) |
| Python function runtime | Python 3.11 |
| Python STT library | SpeechRecognition (calls Google free STT API — no model bundled, fits 50MB function limit) |
| Auth library | Netlify Identity (JWT verification) |

### APIs (all free tier)
| Service | Role | Free limit |
|---|---|---|
| **Bhashini (ULCA)** | Primary STT — all 22 Indian languages | Unlimited (Govt) |
| **Groq Whisper Large v3** | Secondary STT fallback | 7,200 sec/day |
| **Gemini 2.0 Flash** | Optional grammar/script correction pass | 1,500 req/day |

### Infrastructure
| Service | Role | Free limit |
|---|---|---|
| Netlify CDN | Host React SPA | Unlimited |
| Netlify Functions | Serverless API proxy | 125,000 req/month |
| Netlify Identity | Optional OAuth (Google/GitHub) | 1,000 active users |
| Netlify Blobs | Transcript history for logged-in users | 1 GB |

---

## 4. Supported Languages

All 22 scheduled Indian languages: Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Malayalam, Odia, Punjabi, Assamese, Maithili, Sanskrit, Santali, Kashmiri, Nepali, Sindhi, Konkani, Dogri, Manipuri, Bodo — plus English (Indian accent).

Language codes follow BCP-47 (e.g. `hi`, `ta`, `te`, `kn`, `ml`, `bn`, `mr`, `gu`, `pa`, `or`).

---

## 5. Project Structure

```
voice-to-text-agents/
├── src/
│   ├── components/
│   │   ├── Recorder.tsx          # MediaRecorder + waveform UI
│   │   ├── LanguageSelector.tsx  # Dropdown with all 22 languages
│   │   ├── TextPreview.tsx       # Editable transcript area
│   │   ├── ExportPanel.tsx       # Copy + download buttons
│   │   └── HistoryDrawer.tsx     # Slide-in history (logged-in)
│   ├── hooks/
│   │   ├── useRecorder.ts        # MediaRecorder lifecycle
│   │   └── useTranscribe.ts      # POST to /api/transcribe + state
│   ├── store/
│   │   └── appStore.ts           # Zustand: language, transcript, auth, history
│   ├── lib/
│   │   ├── exporters.ts          # txt / docx / pdf / srt generators
│   │   └── languages.ts          # Language metadata (codes, names, scripts)
│   └── App.tsx
├── netlify/
│   ├── functions/
│   │   ├── transcribe.mts        # Node.js — fallback chain orchestrator
│   │   └── transcribe_py/
│   │       ├── handler.py        # Python — faster-whisper last resort
│   │       └── requirements.txt
│   └── edge-functions/           # (reserved for future rate limiting)
├── public/
├── netlify.toml
├── vite.config.ts
└── package.json
```

---

## 6. UI / UX Design

### Theme
Vibrant India — saffron/orange gradient (`#ff6b35` → `#e63946`) on white. Warm, cultural, approachable for rural and urban users alike.

### Layout — Mobile (primary)
- Full-width header with gradient background, app name + language selector
- Large centred record button (thumb-friendly, 56px+ touch target)
- Real-time waveform visualisation while recording
- Scrollable text preview below the recorder
- Copy + Download buttons side by side
- Footer: "Sign in to save history" (if anonymous)

### Layout — Desktop
- Two-column: left = recorder + AI correction toggle; right = transcript + export panel
- Language selector in the top-right header
- History accessible via slide-in drawer (left edge)

### Key UX rules
- Recording button state: idle → recording (pulsing red) → processing (spinner) → done
- Language selector persists to localStorage between sessions
- Text preview is fully editable — user can fix errors before exporting
- AI Correction toggle is visible but off by default; turning it on adds a "✨" badge to the result
- Each transcription shows a small badge: `via Bhashini` / `via Groq` / `via Python` (transparency)

---

## 7. API Contract

### `POST /api/transcribe` (Netlify JS Function)

**Request** — `multipart/form-data`
```
audio      : Blob     — WebM/Opus audio file, max ~10MB (≤5 min)
language   : string   — BCP-47 code e.g. "hi", "ta", "te"
correction : boolean  — whether to run Gemini correction pass
userId     : string?  — Netlify Identity JWT (optional, for history save)
```

**Response** — `application/json`
```json
{
  "text":      "transcribed text string",
  "language":  "hi",
  "engine":    "bhashini" | "groq" | "python",
  "corrected": true | false,
  "duration":  12.4,
  "timestamp": "2026-05-25T10:30:00Z"
}
```

**Error response**
```json
{ "error": "human-readable message", "code": "NO_MIC | TOO_SHORT | ALL_FAILED | OFFLINE" }
```

---

## 8. Fallback Chain

Executed sequentially inside the Node.js Netlify Function. Each step is attempted only if the previous fails or times out.

```
1. Bhashini ULCA API        timeout: 15s   → return on success
2. Groq Whisper Large v3    timeout: 20s   → return on success
3. Python SpeechRecognition timeout: 25s   → calls Google free STT via recognize_google(), no model bundled (fits Netlify 50MB function limit) → return on success (always)
[optional] Gemini 2.0 Flash timeout: 8s    → applied after any successful step
```

The engine used is always returned in the response (`engine` field) and displayed as a small badge in the UI.

---

## 9. Accuracy Improvement Techniques

1. **Language hint injection** — explicit BCP-47 code passed to every engine; Whisper performs 30–40% better than auto-detect mode for Indian languages
2. **Audio pre-processing** — client-side Web Audio API: trim silence, noise gate, normalise volume before upload
3. **Gemini correction prompt** — language-aware: fixes Devanagari/Tamil/other script rendering, handles code-mixed speech (Hinglish, Tanglish), adds punctuation and capitalisation
4. **User-editable output** — text preview is editable; implicit correction loop
5. **SpeechRecognition + Google STT** — Python's `SpeechRecognition` library via `recognize_google()` uses Google's free web speech service; no model to bundle, reliable last-resort fallback

---

## 10. Export Formats

All generated client-side (no backend needed):

| Format | Library | Notes |
|---|---|---|
| `.txt` | Native Blob | Plain UTF-8, preserves all Indian scripts |
| `.docx` | docx.js | Embeds correct Unicode font for each script |
| `.pdf` | jsPDF + font | Noto Sans family for Indian script rendering |
| `.srt` | Custom formatter | Timestamps from audio duration; ~5-word chunks |
| Clipboard | Clipboard API | Falls back to `execCommand` for older browsers |

---

## 11. Authentication & Storage

### Anonymous users
- Full app functionality — no restriction
- Up to 20 recent transcripts stored in `localStorage`
- Cleared when user clears browser data

### Logged-in users (Netlify Identity)
- OAuth via Google or GitHub
- Unlimited transcript history stored in **Netlify Blobs**
- Blob key: `transcripts/{userId}/{ISO-timestamp}`
- History accessible via slide-in drawer, sorted newest first

---

## 12. Error Handling

| Error | User message | Behaviour |
|---|---|---|
| No mic permission | "Please allow microphone access" | Browser prompt + guide |
| Recording < 1s | "Recording too short — try again" | Client-side check, no API call |
| Bhashini unavailable | (silent) | Auto-fallback to Groq, badge updated |
| Groq quota exhausted | (silent) | Auto-fallback to Python function |
| All engines fail | "Transcription failed — please try again" | Toast error, audio preserved |
| Gemini correction fails | (silent) | Raw transcript shown, error logged |
| Offline | "You're offline — connect and retry" | `navigator.onLine` check pre-call |
| Recording > 5 min | Auto-stop + warning at 4:45 | Respects Netlify 26s function timeout |

---

## 13. Testing Strategy

### Unit tests — Vitest
- Fallback chain logic (mock all 3 engines)
- Language code mapping
- Export formatters (txt / docx / pdf / srt output correctness)
- Zustand store actions

### Integration tests — Vitest + MSW
- `/api/transcribe` handler with mocked Bhashini, Groq, Python responses
- Gemini correction pass (on/off)
- Auth JWT verification path

### E2E tests — Playwright
- Record → transcribe → copy full flow
- Auth flow (sign in / sign out)
- Download each format (assert file extension + non-empty)
- Mobile viewport (375px) — record button reachable, layout correct
- Fallback: mock Bhashini failure → assert Groq used

---

## 14. Deployment

```
netlify.toml
  [build]
    command   = "npm run build"
    publish   = "dist"

  [functions]
    directory = "netlify/functions"

  [functions.transcribe]
    node_bundler = "esbuild"

  [functions.transcribe_py]
    timeout = 26  # max on Netlify free tier; enables Python cold-start + SpeechRecognition call

  [[redirects]]
    from = "/api/*"
    to   = "/.netlify/functions/:splat"
    status = 200
```

Environment variables (set in Netlify dashboard, never committed):
```
BHASHINI_API_KEY
BHASHINI_USER_ID
GROQ_API_KEY
GEMINI_API_KEY
```

---

## 15. Constraints & Non-Goals

- **Max recording length:** 5 minutes (Netlify function timeout constraint)
- **No real-time streaming STT:** Audio uploaded after recording stops (simplicity + reliability)
- **No translation:** App transcribes in the spoken language — does not translate between languages
- **No audio storage:** Audio blobs are never persisted; only text transcripts are saved
- **Netlify free tier only:** No paid add-ons, no external databases
