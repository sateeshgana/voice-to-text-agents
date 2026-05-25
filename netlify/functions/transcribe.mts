// netlify/functions/transcribe.mts
import type { Context } from '@netlify/functions'
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ── Pure helpers (exported for testing) ──────────────────────────────────────

export type Engine = 'bhashini' | 'groq' | 'python'

export function buildFallbackChain(): Engine[] {
  return ['bhashini', 'groq', 'python']
}

/**
 * Maps a failed engine name to the next engine to try.
 * Exported for unit testing. The handler loop uses buildFallbackChain() directly.
 */
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
    // Validate language — must be a known BCP-47 code (2–10 chars, letters/digits/hyphen only)
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
