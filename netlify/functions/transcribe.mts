// netlify/functions/transcribe.mts
import type { Context } from '@netlify/functions'
import Groq from 'groq-sdk'

// ── Pure helpers (exported for testing) ──────────────────────────────────────

export type Engine = 'groq' | 'python'

export function buildFallbackChain(): Engine[] {
  return ['groq', 'python']
}

/**
 * Maps a failed engine name to the next engine to try.
 * Exported for unit testing. The handler loop uses buildFallbackChain() directly.
 */
export function selectEngine(failedEngine: string | null): Engine {
  if (!failedEngine) return 'groq'
  return 'python'
}

export async function applyAICorrection(
  text: string,
  language: string,
  enabled: boolean,
  apiKey: string
): Promise<string> {
  if (!enabled || !apiKey) return text
  try {
    // DeepSeek API is OpenAI-compatible
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: `Fix grammar, punctuation, and script rendering for the ${language} language. Return ONLY the corrected text, nothing else:\n\n${text}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return text
    const data = await res.json()
    return data?.choices?.[0]?.message?.content?.trim() || text
  } catch {
    return text // silent fallback
  }
}

// ── API callers ───────────────────────────────────────────────────────────────

async function callGroq(audioBuffer: Buffer, language: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_FAIL: missing key')
  const groq = new Groq({ apiKey, timeout: 20000 })
  const file = new File([audioBuffer.buffer as ArrayBuffer], 'audio.webm', { type: 'audio/webm' })
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
    const audioEntry = formData.get('audio')
    if (!audioEntry || typeof audioEntry === 'string') {
      return new Response(JSON.stringify({ error: 'No audio file provided', code: 'UNKNOWN' }), { status: 400, headers: corsHeaders })
    }
    const audioFile = audioEntry as File

    // Validate language — must be a BCP-47 code (letters only, optional region)
    const rawLang = (formData.get('language') as string) || 'hi'
    const VALID_LANG = /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/
    const language = VALID_LANG.test(rawLang) ? rawLang : 'hi'
    const correction = formData.get('correction') === 'true'

    // Mobile apps (React Native) send AAC (iOS) or M4A/OGG (Android).
    // To support those formats, add ffmpeg-wasm conversion here:
    //   import { createFFmpeg } from '@ffmpeg/ffmpeg'
    //   const ff = createFFmpeg(); await ff.load()
    //   ff.FS('writeFile', 'input', new Uint8Array(audioBuffer))
    //   await ff.run('-i', 'input', '-ar', '16000', 'output.wav')
    //   const wavBuffer = Buffer.from(ff.FS('readFile', 'output.wav'))
    // This is not implemented in v1 (browser always sends WebM).
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    const startTime = Date.now()

    let text = ''
    let engine: Engine = 'groq'
    let lastError = ''

    // Fallback chain: Groq Whisper → Python SpeechRecognition
    for (const eng of buildFallbackChain()) {
      try {
        if (eng === 'groq') text = await callGroq(audioBuffer, language)
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

    // Optional AI correction via DeepSeek
    const correctedText = await applyAICorrection(text, language, correction, process.env.DEEPSEEK_API_KEY ?? '')
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
