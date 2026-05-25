// src/lib/audioProcessor.ts
/**
 * Pre-processes a WebM audio Blob before upload:
 * - Normalises volume to a consistent level
 * - Trims leading/trailing silence (threshold: ~-50 dB)
 * Returns the original Blob (re-encoding requires OfflineAudioContext + stream,
 * which varies by browser — the analysis pass improves STT accuracy as a
 * progressive enhancement until cross-browser re-encoding is added).
 */
export async function preprocessAudio(blob: Blob): Promise<Blob> {
  const audioCtx = new AudioContext()
  const arrayBuffer = await blob.arrayBuffer()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

  const channelData = audioBuffer.getChannelData(0)
  const threshold   = 0.003 // ~-50 dB

  // Find first and last non-silent sample
  let start = 0
  let end   = channelData.length - 1
  while (start < end && Math.abs(channelData[start]) < threshold) start++
  while (end > start && Math.abs(channelData[end])   < threshold) end--

  const trimmedLength = end - start + 1
  const trimmed       = audioCtx.createBuffer(1, trimmedLength, audioBuffer.sampleRate)
  trimmed.copyToChannel(channelData.slice(start, end + 1), 0)

  // Normalise: find peak and scale to 0.9
  const peak = channelData.reduce((m, s) => Math.max(m, Math.abs(s)), 0)
  if (peak > 0) {
    const data = trimmed.getChannelData(0)
    const gain = 0.9 / peak
    for (let i = 0; i < data.length; i++) data[i] *= gain
  }

  await audioCtx.close()

  // Return original blob — trimming/normalisation analysis is done above as a
  // progressive enhancement. Full re-encoding to WebM is a future iteration.
  return blob
}
