/* Client-side YAMNet via TensorFlow.js. Audio stays in the browser. */

import * as tf from '@tensorflow/tfjs'
import { AUDIO_SET_LABELS, canonicalAudioSetLabel, type AudioSetLabel } from './audioSetLabels'

const MODEL_URL = '/yamnet/model.json'
/** YAMNet patch length at 16 kHz (~0.975 s). */
const WINDOW = 15_600
const TARGET_RATE = 16_000

export type SoundGuess = {
  label: AudioSetLabel
  score: number
}

export type ClassifyResult = {
  top: SoundGuess[]
  best: SoundGuess | null
  /** Top AudioSet label, or null if inference failed to produce one. */
  category: AudioSetLabel | null
}

let modelPromise: Promise<tf.GraphModel> | null = null

function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.ready()
      try {
        await tf.setBackend('webgl')
      } catch {
        /* WASM / CPU is fine */
      }
      await tf.ready()
      const model = await tf.loadGraphModel(MODEL_URL)
      // Warm up so the first real clip doesn't pay compile cost
      const warm = tf.zeros([WINDOW])
      try {
        const out = model.execute({ waveform: warm }, 'Identity') as tf.Tensor
        out.dispose()
      } finally {
        warm.dispose()
      }
      return model
    })().catch((err) => {
      modelPromise = null
      throw err
    })
  }
  return modelPromise
}

/** Start downloading the model in the background (e.g. when Record opens). */
export function preloadYamnet() {
  void loadModel().catch(() => undefined)
}

function mono(buffer: AudioBuffer): Float32Array {
  const n = buffer.length
  const out = new Float32Array(n)
  const ch = buffer.numberOfChannels
  for (let c = 0; c < ch; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < n; i++) out[i] += data[i] / ch
  }
  return out
}

/** Linear resample to 16 kHz. Browsers often ignore AudioContext({ sampleRate: 16000 }). */
function resample(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === TARGET_RATE) return input
  const ratio = fromRate / TARGET_RATE
  const n = Math.max(1, Math.round(input.length / ratio))
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = i * ratio
    const i0 = Math.floor(x)
    const i1 = Math.min(input.length - 1, i0 + 1)
    const t = x - i0
    out[i] = input[i0] * (1 - t) + input[i1] * t
  }
  return out
}

async function decodeMono16k(blob: Blob): Promise<Float32Array> {
  const bytes = await blob.arrayBuffer()
  const ctx = new AudioContext()
  try {
    const decoded = await ctx.decodeAudioData(bytes.slice(0))
    return resample(mono(decoded), decoded.sampleRate)
  } finally {
    await ctx.close().catch(() => undefined)
  }
}

/**
 * Classify a recorded clip with YAMNet.
 * Returns the top AudioSet labels; `category` is the best label.
 */
export async function classifySound(blob: Blob, topK = 5): Promise<ClassifyResult> {
  const model = await loadModel()
  const samples = await decodeMono16k(blob)

  // Pad short clips so the model still gets a full window
  const wave =
    samples.length >= WINDOW
      ? samples
      : (() => {
          const padded = new Float32Array(WINDOW)
          padded.set(samples)
          return padded
        })()

  const meanData = tf.tidy(() => {
    const input = tf.tensor1d(wave)
    // Identity = class scores [frames, 521]
    const scoreTensor = model.execute({ waveform: input }, 'Identity') as tf.Tensor
    return scoreTensor.mean(0) as tf.Tensor1D
  })

  try {
    const values = await meanData.data()
    const ranked = Array.from(values)
      .map((score, i) => {
        const raw = AUDIO_SET_LABELS[i]
        const label = (raw ? canonicalAudioSetLabel(raw) : null) ?? raw
        return label ? { label, score } : null
      })
      .filter((g): g is SoundGuess => g !== null)
      .sort((a, b) => b.score - a.score)

    const top = ranked.slice(0, topK)
    const best = top[0] ?? null
    return { top, best, category: best?.label ?? null }
  } finally {
    meanData.dispose()
  }
}
