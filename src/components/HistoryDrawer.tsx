import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { getLanguageByCode } from '@shared/languages'

export function HistoryDrawer() {
  const [open, setOpen] = useState(false)
  const { history, setTranscript, clearHistory } = useAppStore()

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="text-white/80 hover:text-white text-sm font-medium flex items-center gap-1"
        aria-label="Open history"
      >
        📜 History ({history.length})
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative ml-auto w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Transcription History</h2>
              <div className="flex gap-2">
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-600">
                    Clear all
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 && (
                <p className="text-gray-400 text-sm text-center mt-8">No history yet</p>
              )}
              {history.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setTranscript(item.text); setOpen(false) }}
                  className="w-full text-left bg-orange-50 border border-orange-200 rounded-xl p-3 hover:border-orange-400 transition-colors"
                >
                  <p className="text-sm text-gray-800 line-clamp-2">{item.text}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {getLanguageByCode(item.language).nativeName} · {item.engine}
                    {item.corrected && ' ✨'} · {new Date(item.timestamp).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
