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
