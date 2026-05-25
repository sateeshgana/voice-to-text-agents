import { Document, Packer, Paragraph, TextRun } from 'docx'
import jsPDF from 'jspdf'

export function generateTxt(text: string): Blob {
  return new Blob([text], { type: 'text/plain;charset=utf-8' })
}

export function generateSrt(text: string, durationSec: number): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const words = trimmed.split(/\s+/)
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
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
