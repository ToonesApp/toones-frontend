import { loadClip } from '../../lib/audioStore'
import { live, useHome, type Drop } from './homeStore'

const STAND_IN_BASE: Record<Drop['cat'], number> = { Nature: 330, Language: 294, Culture: 262, Music: 349, City: 220 }
const SCALE = [0, 2, 4, 7, 9, 12, 14]
const MAX_STAND_IN = 30

let audio: HTMLAudioElement | null = null
let objectUrl: string | null = null
let ctx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let tick = 0
let token = 0

export function stopPlayback() {
  token++
  window.clearInterval(tick)
  audio?.pause()
  audio = null
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = null
  ctx?.close().catch(() => undefined)
  ctx = null
  analyser = null
  live.level = 0
  if (useHome.getState().playing) useHome.getState().setPlaying(null)
}

export function togglePlayback(drop: Drop) {
  if (useHome.getState().playing?.id === drop.id) stopPlayback()
  else void play(drop)
}

async function play(drop: Drop) {
  stopPlayback()
  const mine = token
  const home = useHome.getState()
  home.setPlaying({ id: drop.id, elapsed: 0 })
  home.markListened(drop.id)
  home.globe?.flyTo([drop.lon, drop.lat])

  // Created before any await so it inherits the click's user activation.
  ctx = new AudioContext()
  analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  analyser.connect(ctx.destination)
  void ctx.resume()

  const blob = drop.standIn ? undefined : await loadClip(drop.id)
  if (mine !== token || !ctx || !analyser) return
  const started = performance.now()
  let length = drop.dur

  if (blob) {
    objectUrl = URL.createObjectURL(blob)
    audio = new Audio(objectUrl)
    ctx.createMediaElementSource(audio).connect(analyser)
    audio.onended = stopPlayback
    audio.play().catch(stopPlayback)
  } else {
    length = Math.min(drop.dur, MAX_STAND_IN)
    synthesize(ctx, analyser, drop, length)
  }

  const buf = new Uint8Array(512)
  tick = window.setInterval(() => {
    if (analyser) {
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (const b of buf) sum += ((b - 128) / 128) ** 2
      live.level = Math.min(1, Math.sqrt(sum / buf.length) * 5)
    }
    const wall = (performance.now() - started) / 1000
    const elapsed = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : wall
    useHome.getState().setPlaying({ id: drop.id, elapsed })
    // Recorded webm often reports no duration and may never fire `ended`.
    const finished = audio ? audio.ended || (audio.paused && audio.currentTime > 0) : elapsed >= length + 0.4
    if (finished || wall >= length + 1.5) stopPlayback()
  }, 100)
}

/** A short seeded melody in the category's key, used when the mic was blocked. */
function synthesize(ac: AudioContext, out: AudioNode, drop: Drop, seconds: number) {
  const gain = ac.createGain()
  gain.gain.value = 0.08
  gain.connect(out)
  let seed = [...drop.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)
  const rnd = () => ((seed = (seed * 1103515245 + 12345) | 0) >>> 0) / 4294967296
  const base = STAND_IN_BASE[drop.cat]
  for (let t = 0; t < seconds; t += 0.32) {
    if (rnd() < 0.25) continue
    const osc = ac.createOscillator()
    const env = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.value = base * 2 ** (SCALE[Math.floor(rnd() * SCALE.length)] / 12)
    const at = ac.currentTime + t
    env.gain.setValueAtTime(0, at)
    env.gain.linearRampToValueAtTime(1, at + 0.02)
    env.gain.exponentialRampToValueAtTime(0.001, at + 0.6)
    osc.connect(env)
    env.connect(gain)
    osc.start(at)
    osc.stop(at + 0.65)
  }
}
