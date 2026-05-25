import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { useRecorder } from '../hooks/useRecorder'
import { useTranscribe } from '../hooks/useTranscribe'
import { useAppStore } from '../store/appStore'

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function Recorder() {
  const { state, audioBlob, startRecording, stopRecording, resetRecording, durationSec } = useRecorder()
  const { transcribe } = useTranscribe()
  const { isProcessing } = useAppStore()
  const waveRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)

  // Init WaveSurfer for playback after recording
  useEffect(() => {
    if (state === 'stopped' && audioBlob && waveRef.current) {
      wavesurferRef.current?.destroy()
      const ws = WaveSurfer.create({
        container: waveRef.current,
        waveColor: '#ff6b35',
        progressColor: '#e63946',
        height: 48,
        barWidth: 3,
        barGap: 2,
        barRadius: 2,
        url: URL.createObjectURL(audioBlob),
      })
      wavesurferRef.current = ws
    }
  }, [state, audioBlob])

  const handleClick = async () => {
    if (state === 'idle') {
      await startRecording()
    } else if (state === 'recording') {
      stopRecording()
    } else if (state === 'stopped' && audioBlob) {
      await transcribe(audioBlob, durationSec)
      resetRecording()
    }
  }

  const buttonLabel = state === 'idle' ? '🎙 Start Recording'
    : state === 'recording' ? '⏹ Stop Recording'
    : isProcessing ? '⏳ Processing…'
    : '✅ Transcribe'

  const buttonClass = `w-full py-4 rounded-2xl font-bold text-white text-lg transition-all
    ${state === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-[#ff6b35] to-[#e63946]'}
    ${isProcessing ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`

  return (
    <div className="space-y-4">
      {/* Waveform */}
      <div className="bg-orange-50 border-2 border-dashed border-orange-300 rounded-2xl p-4 min-h-[80px] flex items-center justify-center">
        {state === 'idle' && (
          <p className="text-orange-300 text-sm">Tap the button below to start recording</p>
        )}
        {state === 'recording' && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-orange-400 rounded-full animate-pulse"
                style={{ height: `${Math.random() * 40 + 8}px`, animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        )}
        {state === 'stopped' && <div ref={waveRef} className="w-full" />}
      </div>

      {/* Timer */}
      {state !== 'idle' && (
        <p className="text-center text-sm text-gray-500 tabular-nums">
          {formatTime(durationSec)} / 05:00
        </p>
      )}

      <button
        onClick={handleClick}
        disabled={isProcessing}
        className={buttonClass}
        aria-label={buttonLabel}
      >
        {buttonLabel}
      </button>

      {state === 'stopped' && !isProcessing && (
        <button
          onClick={resetRecording}
          className="w-full py-2 text-sm text-gray-400 hover:text-gray-600"
        >
          ✕ Discard and record again
        </button>
      )}
    </div>
  )
}
