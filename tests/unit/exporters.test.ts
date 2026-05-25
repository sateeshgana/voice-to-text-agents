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
