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

  it('returns corrected text when correction is enabled and Gemini responds', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: { text: () => 'नमस्ते' },
    })
    vi.mocked(GoogleGenerativeAI).mockImplementationOnce(() => ({
      getGenerativeModel: () => ({ generateContent: mockGenerateContent }),
    }) as any)

    const result = await applyGeminiCorrection('namaste', 'hi', true, 'real-key')
    expect(result).toBe('नमस्ते')
    expect(mockGenerateContent).toHaveBeenCalledOnce()
  })

  it('returns original text when Gemini throws', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    vi.mocked(GoogleGenerativeAI).mockImplementationOnce(() => ({
      getGenerativeModel: () => ({
        generateContent: vi.fn().mockRejectedValue(new Error('API error')),
      }),
    }) as any)

    const result = await applyGeminiCorrection('hello', 'hi', true, 'real-key')
    expect(result).toBe('hello')
  })
})

describe('handler fallback chain (integration)', () => {
  it('falls back from bhashini through groq to python, returning python result', async () => {
    // jsdom's Request.formData() hangs, so we mock formData() on the request.
    // Bhashini fails: missing env vars → throws immediately (no fetch)
    // Groq: default vi.fn() returns undefined → !result → throws GROQ_FAIL
    // Python: fetch call intercepted by stub → returns success
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: 'python transcript' }), { status: 200 })
    )
    vi.stubGlobal('fetch', mockFetch)

    // jsdom's File lacks arrayBuffer(), so we build a plain object that satisfies the guard.
    // The guard only checks: !audioEntry || typeof audioEntry === 'string'
    const fakeAudioBuffer = Buffer.from('fake-audio')
    const fakeFile = {
      arrayBuffer: () => Promise.resolve(fakeAudioBuffer.buffer as ArrayBuffer),
      name: 'audio.webm',
      type: 'audio/webm',
      size: fakeAudioBuffer.length,
    }
    const formData = new FormData()
    // Use a real FormData but override get() to return our fake file
    const origGet = formData.get.bind(formData)
    vi.spyOn(formData, 'get').mockImplementation((key: string) => {
      if (key === 'audio') return fakeFile as any
      if (key === 'language') return 'hi'
      if (key === 'correction') return 'false'
      return origGet(key)
    })

    // Create a Request but mock formData() to avoid jsdom's broken multipart parsing
    const req = new Request('http://localhost/.netlify/functions/transcribe', {
      method: 'POST',
      body: '{}',
    })
    vi.spyOn(req, 'formData').mockResolvedValue(formData)

    // GROQ_API_KEY must be set so callGroq proceeds past the key guard
    process.env.GROQ_API_KEY = 'test-groq-key'
    delete process.env.BHASHINI_USER_ID
    delete process.env.BHASHINI_API_KEY

    const { default: handler } = await import('../../netlify/functions/transcribe.mts')
    const res = await handler(req, {} as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.engine).toBe('python')
    expect(body.text).toBe('python transcript')
    expect(mockFetch).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
    delete process.env.GROQ_API_KEY
  })
})
