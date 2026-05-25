import { useAppStore } from '../store/appStore'

const ENGINE_LABELS: Record<string, { label: string; color: string }> = {
  groq:   { label: 'via Groq',   color: 'bg-yellow-100 text-yellow-700' },
  python: { label: 'via Python', color: 'bg-red-100 text-red-700' },
}

export function TextPreview() {
  const { transcript, setTranscript, correctionEnabled, toggleCorrection, history, error } = useAppStore()
  const lastItem = history[0]

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Transcript</span>
        <div className="flex items-center gap-2">
          {lastItem && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENGINE_LABELS[lastItem.engine].color}`}>
              {ENGINE_LABELS[lastItem.engine].label}
              {lastItem.corrected && ' ✨'}
            </span>
          )}
        </div>
      </div>

      {/* Editable textarea */}
      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Your transcription will appear here…"
        rows={8}
        className="w-full bg-orange-50 border border-orange-200 rounded-xl p-3 text-gray-800
                   text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300
                   placeholder:text-gray-300"
        aria-label="Transcription text — editable"
      />

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* AI Correction toggle */}
      <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-purple-700">✨ AI Correction</p>
          <p className="text-xs text-gray-400">DeepSeek grammar & script fix</p>
        </div>
        <button
          onClick={toggleCorrection}
          role="switch"
          aria-checked={correctionEnabled}
          className={`relative w-10 h-6 rounded-full transition-colors ${correctionEnabled ? 'bg-purple-500' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow
            ${correctionEnabled ? 'translate-x-5' : 'translate-x-1'}`}
          />
        </button>
      </div>
    </div>
  )
}
