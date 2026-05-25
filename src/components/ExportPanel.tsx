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
