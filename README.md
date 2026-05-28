# 🎙 VoiceIndia — बोलो, लिखो

> Free voice-to-text for all 22 scheduled Indian languages + Indian-accent English.  
> Hosted on Netlify's free tier — **zero running cost**.

🌐 **Live:** [voice-to-text-ai.netlify.app](https://voice-to-text-ai.netlify.app)

---

## Features

- 🗣 **Record audio** in-browser (WebM/Opus)
- 🌍 **22 Indian languages** + English (Indian accent)
- 🔁 **Fallback chain:** Groq Whisper → Python SpeechRecognition
- ✨ **AI Correction** via DeepSeek (optional toggle)
- 📋 **Export:** .txt / .docx / .pdf / .srt / clipboard
- 📜 **History** — localStorage for anonymous, Netlify Blobs for signed-in users
- 📱 **PWA** — installable on Android/iOS
- 🔐 **Optional auth** via Netlify Identity (Google / GitHub)
- ↔️ **RTL support** for Urdu, Kashmiri, Sindhi

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| State | Zustand (persisted to localStorage) |
| Audio | MediaRecorder API + wavesurfer.js |
| STT Primary | [Groq Whisper Large v3](https://console.groq.com) — 7,200 sec/day free |
| STT Fallback | Python SpeechRecognition → Google free STT |
| AI Correction | [DeepSeek Chat](https://platform.deepseek.com) |
| Backend | Netlify Functions (Node 20 + Python 3.11) |
| Auth | Netlify Identity |
| Storage | Netlify Blobs (1 GB free) |
| PWA | vite-plugin-pwa |

---

## Local Development

### Prerequisites
- Node.js 20+
- Python 3.11+ (for the Python fallback function)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/)

### Setup

```bash
# 1. Clone
git clone https://github.com/sateeshgana/voice-to-text-agents.git
cd voice-to-text-agents

# 2. Install dependencies
npm install

# 3. Set environment variables
cp .env.example .env
# Edit .env and fill in your API keys (see below)

# 4. Start local dev server (Netlify Functions included)
netlify dev
```

Open [http://localhost:8888](http://localhost:8888)

> **Note:** `npm run dev` starts the Vite frontend only (no Netlify Functions). Use `netlify dev` for full-stack local development.

---

## Environment Variables

Copy `.env.example` to `.env` and add your keys:

| Variable | Where to get it | Required |
|---|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com/keys) | ✅ Yes |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com/app/apikey) | Optional |
| `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com) | Optional (AI Correction) |

> The Python fallback (SpeechRecognition) requires no API key — it uses Google's free web speech service.

---

## Project Structure

```
voice-to-text-agents/
├── packages/shared/          # Shared TypeScript types + language data
│   ├── types.ts              # TranscribeRequest/Response, Language, HistoryItem
│   └── languages.ts          # All 23 languages with taglines + RTL flags
├── src/
│   ├── components/           # React UI components
│   │   ├── Recorder.tsx      # Record button + waveform
│   │   ├── LanguageSelector.tsx
│   │   ├── TextPreview.tsx   # Editable transcript + AI correction toggle
│   │   ├── ExportPanel.tsx   # Copy + download buttons
│   │   └── HistoryDrawer.tsx # Slide-in history
│   ├── hooks/
│   │   ├── useRecorder.ts    # MediaRecorder lifecycle
│   │   ├── useTranscribe.ts  # POST /api/transcribe + store
│   │   └── useAuth.ts        # Netlify Identity
│   ├── lib/
│   │   ├── exporters.ts      # txt / docx / pdf / srt generators
│   │   └── audioProcessor.ts # Silence trim + volume normalise
│   └── store/appStore.ts     # Zustand store
├── netlify/functions/
│   ├── transcribe.mts        # Node 20: Groq → Python fallback chain
│   ├── history-save.mts      # Save transcript to Netlify Blobs
│   └── transcribe_py/
│       ├── handler.py        # Python: SpeechRecognition → Google STT
│       └── requirements.txt
├── tests/
│   ├── unit/                 # Vitest unit tests (23 tests)
│   └── e2e/                  # Playwright E2E tests (6 tests)
├── public/
│   ├── manifest.json         # PWA manifest
│   └── icons/icon-192.png
└── netlify.toml
```

---

## STT Fallback Chain

```
User records audio (WebM/Opus)
        ↓
POST /api/transcribe
        ↓
  ┌─────────────────┐
  │ 1. Groq Whisper │  ← 7,200 sec/day free, 20s timeout
  │    Large v3     │
  └────────┬────────┘
           │ fail?
           ↓
  ┌──────────────────────┐
  │ 2. Python            │  ← No quota, uses Google free STT
  │    SpeechRecognition │     26s timeout (Netlify max)
  └──────────────────────┘
           ↓ (optional)
  ┌─────────────────────┐
  │ ✨ DeepSeek          │  ← Grammar + script correction
  │    AI Correction     │     Only if toggle is ON
  └─────────────────────┘
```

---

## Deployment

The app is configured for Netlify. Push to `main` to auto-deploy.

**Set these in Netlify dashboard → Site Configuration → Environment Variables:**
- `GROQ_API_KEY`
- `DEEPSEEK_API_KEY`
- `GEMINI_API_KEY` (optional)

---

## Testing

```bash
# Unit tests (Vitest)
npx vitest run

# E2E tests (Playwright — requires dev server)
npx playwright test

# Type check
npx tsc --noEmit

# Production build
npm run build
```

---

## Supported Languages

All 22 scheduled Indian languages + Indian-accent English:

Hindi · Bengali · Telugu · Marathi · Tamil · Urdu · Gujarati · Kannada · Malayalam · Odia · Punjabi · Assamese · Maithili · Sanskrit · Santali · Kashmiri · Nepali · Sindhi · Konkani · Dogri · Manipuri · Bodo · English (Indian)

---

## License

MIT
