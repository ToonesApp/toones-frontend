import { getToken, recordListen } from '../../lib/api'
import { XP_PER_LISTEN } from '../../lib/xp'
import { useHome } from '../home/homeStore'
import { synthesize } from '../home/player'
import { useFeed, visibleToones, type Toone } from './feedStore'

let audio: HTMLAudioElement | null = null
let ctx: AudioContext | null = null
let tick = 0
let token = 0
/** Stand-in clock: performance.now() at elapsed 0. */
let zero = 0

function release() {
  token++
  window.clearInterval(tick)
  if (audio) {
    audio.onerror = null
    audio.pause()
  }
  audio = null
  ctx?.close().catch(() => undefined)
  ctx = null
}

export function stopFeed() {
  release()
  if (useFeed.getState().playing) useFeed.getState().setPlaying(null)
}

export function toggleFeed(t: Toone) {
  if (useFeed.getState().playing?.id === t.id) stopFeed()
  else playFeed(t)
}

/** Seek within the playing Toone, or start `t` at that point. */
export function seekFeed(t: Toone, fraction: number) {
  const at = Math.max(0, Math.min(1, fraction)) * t.dur
  if (useFeed.getState().playing?.id !== t.id) return playFeed(t, at)
  if (audio) audio.currentTime = at
  zero = performance.now() - at * 1000
  useFeed.getState().setPlaying({ id: t.id, elapsed: at })
}

/** Previous (-1) or next (+1) visible Toone. */
export function stepFeed(dir: 1 | -1) {
  const s = useFeed.getState()
  const list = visibleToones(s)
  const next = list[list.findIndex((t) => t.id === s.playing?.id) + dir]
  if (next) playFeed(next)
}

function playFeed(t: Toone, from = 0) {
  release()
  const mine = token
  const feed = useFeed.getState()
  feed.setPlaying({ id: t.id, elapsed: from })
  zero = performance.now() - from * 1000
  if (from === 0) void countListen(t)

  const standIn = () => {
    if (mine !== token) return
    audio = null
    ctx = new AudioContext()
    void ctx.resume()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    synthesize(ctx, gain, t, Math.max(1, t.dur - elapsedNow()))
  }

  if (t.audioUrl) {
    audio = new Audio(t.audioUrl)
    audio.currentTime = from
    audio.onerror = standIn
    audio.play().catch((e: unknown) => {
      // NotAllowedError: autoplay blocked; anything else means the file can't play
      if (e instanceof DOMException && e.name === 'NotAllowedError') stopFeed()
      else standIn()
    })
  } else standIn()

  tick = window.setInterval(() => {
    if (mine !== token) return
    const elapsed = elapsedNow()
    if (elapsed >= t.dur || audio?.ended) return finished(t)
    useFeed.getState().setPlaying({ id: t.id, elapsed })
  }, 100)
}

function elapsedNow() {
  if (audio && Number.isFinite(audio.currentTime) && !audio.paused) return audio.currentTime
  return (performance.now() - zero) / 1000
}

function finished(t: Toone) {
  const s = useFeed.getState()
  const list = visibleToones(s)
  const next = list[list.findIndex((x) => x.id === t.id) + 1]
  if (s.settings.autoplay && next) playFeed(next)
  else stopFeed()
}

async function countListen(t: Toone) {
  if (!getToken() || t.id.startsWith('local-')) return
  try {
    const r = await recordListen(t.id)
    useFeed.getState().setListens(t.id, r.playCount)
    if (r.firstListen) useHome.getState().gainXp(XP_PER_LISTEN)
  } catch {
    /* listen counts are best-effort */
  }
}
