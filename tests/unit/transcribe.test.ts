// tests/unit/transcribe.test.ts
import { describe, it, expect, vi } from 'vitest'

// Mock Groq SDK before importing the handler
vi.mock('groq-sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: vi.fn(),
      },
    },
  })),
}))

// We test the pure functions exported from the handler
import {
  selectEngine,
  buildFallbackChain,
  applyAICorrection,
} from '../../netlify/functions/transcribe.mts'

describe('selectEngine', () => {
  it('returns groq when no error', () => {
    expect(selectEngine(null)).toBe('groq')
  })
  it('returns python when groq fails', () => {
    expect(selectEngine('GROQ_FAIL')).toBe('python')
  })
})

describe('buildFallbackChain', () => {
  it('returns ordered list: groq then python', () => {
    expect(buildFallbackChain()).toEqual(['groq', 'python'])
  })
})

describe('applyAICorrection', () => {
  it('returns original text when correction is disabled', async () => {
    const result = await applyAICorrection('hello', 'hi', false, 'fake-key')
    expect(result).toBe('hello')
  })

  it('returns original text when no API key provided', async () => {
    const result = await applyAICorrection('hello', 'hi', true, '')
    expect(result).toBe('hello')
  })

  it('returns corrected text from DeepSeek response', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'नमस्ते' } }] }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', mockFetch)

    const result = await applyAICorrection('namaste', 'hi', true, 'real-key')
    expect(result).toBe('नमस्ते')
    expect(mockFetch).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
  })

  it('returns original text when DeepSeek throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    const result = await applyAICorrection('hello', 'hi', true, 'real-key')
    expect(result).toBe('hello')
    vi.unstubAllGlobals()
  })
})

describe('handler fallback chain (integration)', () => {
  it('falls back from groq to python, returning python result', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: 'python transcript' }), { status: 200 })
    )
    vi.stubGlobal('fetch', mockFetch)

    // Groq SDK mock returns undefined → triggers GROQ_FAIL
    const Groq = (await import('groq-sdk')).default
    vi.mocked(Groq).mockImplementationOnce(() => ({
      audio: { transcriptions: { create: vi.fn().mockResolvedValue(undefined) } },
    }) as any)

    const fakeAudioBuffer = Buffer.from('fake-audio')
    const fakeFile = {
      arrayBuffer: () => Promise.resolve(fakeAudioBuffer.buffer as ArrayBuffer),
      name: 'audio.webm',
      type: 'audio/webm',
    }
    const formData = new FormData()
    vi.spyOn(formData, 'get').mockImplementation((key: string) => {
      if (key === 'audio') return fakeFile as any
      if (key === 'language') return 'hi'
      if (key === 'correction') return 'false'
      return null
    })

    const req = new Request('http://localhost/.netlify/functions/transcribe', {
      method: 'POST',
      body: '{}',
    })
    vi.spyOn(req, 'formData').mockResolvedValue(formData)

    process.env.GROQ_API_KEY = 'test-groq-key'

    const { default: handler } = await import('../../netlify/functions/transcribe.mts')
    const res = await handler(req, {} as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.engine).toBe('python')
    expect(body.text).toBe('python transcript')

    vi.unstubAllGlobals()
    delete process.env.GROQ_API_KEY
  })
})
