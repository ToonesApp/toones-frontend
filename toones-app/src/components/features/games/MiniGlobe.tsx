import { useEffect, useRef } from 'react'
import { geoDistance, geoInterpolate, geoOrthographic, geoPath, type GeoProjection } from 'd3-geo'
import { clamp, fitCanvas, prefersReducedMotion, smoothstep } from '../../characters/clay'
import type { LngLat } from '../../lib/geo'
import { useNight } from '../../lib/storage'
import { drawHandoffGlobe, loadHandoffGeo, type HandoffGeo } from '../transition/handoffGlobe'
import type { Geo } from './types'

type MiniGlobeProps = {
  /** The globe spins until this point faces the viewer. */
  target?: Geo | null
  /** The player's pin. */
  guess?: Geo | null
  /** Lets the player turn the globe and drop a pin by tap, click or Enter. */
  onPick?: (at: Geo) => void
  label: string
}

const SPIN_MS = 1400
const KEY_STEP = 8
const TERRACOTTA = '#C45C3E'

/** The hand-off globe at card size: spins to a place on reveal, and takes a pin in hard mode. */
export function MiniGlobe({ target = null, guess = null, onPick, label }: MiniGlobeProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [night] = useNight()
  const props = useRef({ target, guess, onPick, night })

  useEffect(() => {
    props.current = { target, guess, onPick, night }
  })

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const reduce = prefersReducedMotion()
    const first = props.current.target
    let geo: HandoffGeo | null = null
    let center: LngLat = first ? [first.lng - 110, 0] : [10, 20]
    let spin: { at: (t: number) => LngLat; start: number } | null = null
    let facing: Geo | null = null
    let drag: { x: number; y: number; moved: number } | null = null
    let view: { proj: GeoProjection; cx: number; cy: number; R: number } | null = null
    let raf = 0
    let alive = true
    void loadHandoffGeo().then((g) => {
      if (alive) geo = g
    })

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const p = props.current
      const { g, w, h } = fitCanvas(c)
      if (!g || !w || !h) return

      if (p.target !== facing) {
        facing = p.target
        if (p.target) {
          const to: LngLat = [p.target.lng, p.target.lat]
          if (reduce) center = to
          else spin = { at: geoInterpolate(center, to) as (t: number) => LngLat, start: now }
        }
      }
      if (spin) {
        const t = clamp((now - spin.start) / SPIN_MS)
        center = spin.at(smoothstep(t))
        if (t === 1) spin = null
      }

      const R = Math.min(w, h) / 2 / 1.18
      const cx = w / 2
      const cy = h / 2
      const ink = p.night ? '#EAF0FA' : '#1B2430'
      g.clearRect(0, 0, w, h)
      drawHandoffGlobe(g, { cx, cy, rx: R, ry: R, night: p.night ? 1 : 0, reveal: 1, geo, center })
      const proj = geoOrthographic().clipAngle(90).scale(R).translate([cx, cy]).rotate([-center[0], -center[1], 0])
      view = { proj, cx, cy, R }

      const dot = (at: Geo, color: string, pulse: boolean) => {
        const xy = geoDistance(center, [at.lng, at.lat]) < Math.PI / 2 ? proj([at.lng, at.lat]) : null
        if (!xy) return
        if (pulse && !reduce) {
          const u = (now / 1400) % 1
          g.beginPath()
          g.arc(xy[0], xy[1], 6 + u * 14, 0, Math.PI * 2)
          g.strokeStyle = color
          g.globalAlpha = 1 - u
          g.lineWidth = 2
          g.stroke()
          g.globalAlpha = 1
        }
        g.beginPath()
        g.arc(xy[0], xy[1], 6, 0, Math.PI * 2)
        g.fillStyle = color
        g.fill()
        g.lineWidth = 2
        g.strokeStyle = '#fff'
        g.stroke()
      }

      if (p.guess && p.target) {
        g.beginPath()
        geoPath(proj, g)({ type: 'LineString', coordinates: [[p.guess.lng, p.guess.lat], [p.target.lng, p.target.lat]] })
        g.setLineDash([4, 4])
        g.lineWidth = 1.5
        g.strokeStyle = ink
        g.stroke()
        g.setLineDash([])
      }
      if (p.guess) dot(p.guess, ink, false)
      if (p.target) dot(p.target, TERRACOTTA, true)
      if (p.onPick && document.activeElement === c) {
        g.beginPath()
        g.moveTo(cx - 9, cy)
        g.lineTo(cx + 9, cy)
        g.moveTo(cx, cy - 9)
        g.lineTo(cx, cy + 9)
        g.lineWidth = 2
        g.strokeStyle = ink
        g.stroke()
      }
    }
    raf = requestAnimationFrame(frame)

    const turn = (dLon: number, dLat: number) => {
      spin = null
      center = [((center[0] + dLon + 540) % 360) - 180, clamp(center[1] + dLat, -85, 85)]
    }
    const onDown = (e: PointerEvent) => {
      if (!props.current.onPick) return
      drag = { x: e.clientX, y: e.clientY, moved: 0 }
      c.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!drag || !view) return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      const k = 180 / (Math.PI * view.R)
      drag = { x: e.clientX, y: e.clientY, moved: drag.moved + Math.abs(dx) + Math.abs(dy) }
      turn(-dx * k, dy * k)
    }
    const onUp = (e: PointerEvent) => {
      const tap = drag && drag.moved < 6
      drag = null
      if (!tap || !view) return
      const r = c.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      const at = Math.hypot(x - view.cx, y - view.cy) <= view.R ? view.proj.invert?.([x, y]) : null
      if (at) props.current.onPick?.({ lng: at[0], lat: at[1] })
    }
    const onKey = (e: KeyboardEvent) => {
      if (!props.current.onPick) return
      const step: Record<string, [number, number]> = { ArrowLeft: [-KEY_STEP, 0], ArrowRight: [KEY_STEP, 0], ArrowUp: [0, KEY_STEP], ArrowDown: [0, -KEY_STEP] }
      if (step[e.key]) turn(...step[e.key])
      else if (e.key === 'Enter' || e.key === ' ') props.current.onPick({ lng: center[0], lat: center[1] })
      else return
      e.preventDefault()
    }
    c.addEventListener('pointerdown', onDown)
    c.addEventListener('pointermove', onMove)
    c.addEventListener('pointerup', onUp)
    c.addEventListener('pointercancel', onUp)
    c.addEventListener('keydown', onKey)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      c.removeEventListener('pointerdown', onDown)
      c.removeEventListener('pointermove', onMove)
      c.removeEventListener('pointerup', onUp)
      c.removeEventListener('pointercancel', onUp)
      c.removeEventListener('keydown', onKey)
    }
  }, [])

  return onPick ? (
    <canvas ref={ref} className="mini-globe is-live" tabIndex={0} role="application" aria-label={`${label} Drag or use the arrow keys to turn the globe. Tap a place, or press Enter to pin the center.`} />
  ) : (
    <canvas ref={ref} className="mini-globe" role="img" aria-label={label} />
  )
}
