// src/hooks/useRecorder.ts
import { useState, useRef, useCallback } from 'react'

export type RecorderState = 'idle' | 'recording' | 'stopped'

export interface UseRecorderReturn {
  state: RecorderState
  audioBlob: Blob | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  resetRecording: () => void
  durationSec: number
  analyserNode: AnalyserNode | null
}

export function useRecorder(): UseRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [durationSec, setDurationSec] = useState(0)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef      = useRef<AudioContext | null>(null)

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // Set up Web Audio analyser for waveform
    const audioCtx  = new AudioContext()
    const source    = audioCtx.createMediaStreamSource(stream)
    const analyser  = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    audioCtxRef.current = audioCtx
    setAnalyserNode(analyser)

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    chunksRef.current = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setAudioBlob(blob)
      stream.getTracks().forEach(t => t.stop())
      audioCtx.close()
    }

    recorder.start(100) // collect data every 100ms
    mediaRecorderRef.current = recorder
    setState('recording')
    setDurationSec(0)

    // Auto-stop at 5 min (300s), warn at 4:45 (285s)
    timerRef.current = setInterval(() => {
      setDurationSec(prev => {
        if (prev >= 299) {
          stopRecording()
          return 300
        }
        return prev + 1
      })
    }, 1000)
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setState('stopped')
  }, [])

  const resetRecording = useCallback(() => {
    setAudioBlob(null)
    setDurationSec(0)
    setAnalyserNode(null)
    setState('idle')
  }, [])

  return { state, audioBlob, startRecording, stopRecording, resetRecording, durationSec, analyserNode }
}
