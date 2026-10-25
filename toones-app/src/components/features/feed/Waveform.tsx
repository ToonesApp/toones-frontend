import { useEffect, useRef, type PointerEvent } from 'react'
import { fitCanvas, prefersReducedMotion } from '../../characters/clay'
import { useNight } from '../../lib/storage'

const GAP = 2

/** Bar heights 0..1, seeded from the Toone id so a card always shows the same shape. */
function barsFor(id: string, count: number) {
  let seed = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 17)
  const rnd = () => ((seed = (seed * 1103515245 + 12345) | 0) >>> 0) / 4294967296
  return Array.from({ length: count }, (_, i) => {
    const swell = 0.55 + 0.45 * Math.sin((i / count) * Math.PI * 2.3 + rnd())
    return Math.max(0, Math.min(1, swell * (0.45 + rnd() * 0.65)))
  })
}

type WaveformProps = {
  id: string
  bars: number
  /** CSS px tall. */
  height: number
  minBar: number
  maxBar: number
  progress: number
  playing: boolean
  onSeek?: (fraction: number) => void
  className?: string
}

export function Waveform({ id, bars, height, minBar, maxBar, progress, playing, onSeek, className }: WaveformProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [night] = useNight()
  const live = useRef({ progress, playing, night })

  useEffect(() => {
    live.current = { progress, playing, night }
  })

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const shape = barsFor(id, bars)
    const reduce = prefersReducedMotion()
    let raf = 0
    const draw = (now: number) => {
      const { g, w, h } = fitCanvas(c)
      if (!g || !w) return
      const p = live.current
      g.clearRect(0, 0, w, h)
      const bw = (w - GAP * (bars - 1)) / bars
      const played = p.night ? '#F0A58A' : '#C45C3E'
      const rest = p.night ? 'rgba(165,178,198,.35)' : 'rgba(90,103,116,.35)'
      shape.forEach((v, i) => {
        const shimmer = p.playing && !reduce ? 1 + 0.2 * Math.sin(now / 125 + i * 0.9) : 1
        const bh = Math.min(h, (minBar + (maxBar - minBar) * v) * shimmer)
        g.fillStyle = (i + 0.5) / bars <= p.progress ? played : rest
        g.beginPath()
        g.roundRect(i * (bw + GAP), (h - bh) / 2, bw, bh, 2)
        g.fill()
      })
      if (p.playing) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [id, bars, minBar, maxBar, playing, progress, night])

  const seek = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!onSeek) return
    const r = e.currentTarget.getBoundingClientRect()
    onSeek((e.clientX - r.left) / r.width)
  }

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ height, cursor: onSeek ? 'pointer' : undefined }}
      aria-hidden="true"
      onPointerDown={onSeek ? seek : undefined}
    />
  )
}
