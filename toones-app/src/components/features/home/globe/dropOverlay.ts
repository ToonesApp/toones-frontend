import type { Map as MapLibreMap } from 'maplibre-gl'
import {
  CharacterMotion,
  clamp,
  fitCanvas,
  prefersReducedMotion,
  spawnNote,
  stepNotes,
  type Note,
} from '../../../characters/clay'
import { angularDistance, type LngLat } from '../../../lib/geo'
import { live, type Drop, type Spot } from '../homeStore'

type Hit = { id: string; x: number; y: number; hw: number; hh: number }

const TAU = Math.PI * 2
const TERRACOTTA: [number, number, number] = [196, 92, 62]

const backOut = (p: number) => {
  const s = 1.70158
  p -= 1
  return p * p * ((s + 1) * p + s) + 1
}

/** Draws drop pins, the chosen-spot marker and notes on a canvas above the map. */
export class DropOverlay {
  private canvas: HTMLCanvasElement
  private motions = new Map<string, CharacterMotion>()
  private notes: Note[] = []
  private hits: Hit[] = []
  private reduce = prefersReducedMotion()
  private burstDone = new Set<string>()

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  hitTest(p: { x: number; y: number }) {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i]
      if (Math.abs(p.x - h.x) < h.hw && Math.abs(p.y - h.y) < h.hh) return h.id
    }
    return null
  }

  hop(id: string) {
    const m = this.motions.get(id)
    const h = this.hits.find((x) => x.id === id)
    if (m && !this.reduce) m.jump(260)
    if (h) for (let i = 0; i < 3; i++) setTimeout(() => this.notes.push(spawnNote(h.x, h.y - h.hh, { spread: h.hw })), i * 110)
  }

  emitAt(x: number, y: number, night: boolean) {
    this.notes.push(spawnNote(x, y, { night }))
  }

  draw(map: MapLibreMap, opts: { drops: Drop[]; spot: Spot | null; playingId: string | null; night: number; fitZoom: number; dt: number; t: number }) {
    const { g, w, h } = fitCanvas(this.canvas)
    if (!g || !w || !h) return
    g.clearRect(0, 0, w, h)
    const now = performance.now()
    const c = map.getCenter()
    const center: LngLat = [c.lng, c.lat]
    const r = clamp(6 * 2 ** (0.3 * (map.getZoom() - opts.fitZoom)), 6, 11)

    // Far-side drops first so nearer ones overlap them
    const placed = opts.drops
      .map((d) => ({ d, dist: angularDistance(center, [d.lon, d.lat]) }))
      .filter((x) => x.dist < 1.5)
      .sort((a, b) => b.dist - a.dist)

    this.hits = []
    for (const { d, dist } of placed) {
      const alpha = clamp((1.5 - dist) / 0.22)
      const p = map.project([d.lon, d.lat])
      if (p.x < -40 || p.y < -40 || p.x > w + 40 || p.y > h + 40) continue

      let m = this.motions.get(d.id)
      if (!m) {
        m = new CharacterMotion()
        this.motions.set(d.id, m)
      }
      if (live.hops.delete(d.id)) this.hop(d.id)
      m.step(opts.dt, { reduce: this.reduce })

      const popAt = live.popped.get(d.id)
      const pop = popAt == null ? 1 : now < popAt ? 0 : this.reduce ? 1 : backOut(clamp((now - popAt) / 450))
      if (popAt != null && now >= popAt && !this.burstDone.has(d.id)) {
        this.burstDone.add(d.id)
        for (let i = 0; i < 4; i++) setTimeout(() => this.notes.push(spawnNote(p.x, p.y - r * 3, { night: opts.night > 0.5 })), i * 120)
      }
      if (pop <= 0) continue

      const isPlaying = d.id === opts.playingId
      const level = isPlaying ? live.level : 0
      const k = r * pop * (1 + level * 0.25)
      const lift = m.hop * (r / 11)
      g.globalAlpha = alpha
      this.drawDropPin(g, p.x, p.y, k, lift, isPlaying, opts.t)
      g.globalAlpha = 1
      if (alpha > 0.4) this.hits.push({ id: d.id, x: p.x, y: p.y - lift - k * 2, hw: k + 6, hh: k * 1.6 + 6 })
    }

    if (opts.spot) {
      const s = map.project([opts.spot.lon, opts.spot.lat])
      this.drawSpot(g, s.x, s.y, opts.t)
    }
    this.notes = stepNotes(g, this.notes, opts.dt, 0.8)
  }

  /** Teardrop pin with its tip on the drop; `lift` raises it off its shadow while hopping. */
  private drawDropPin(g: CanvasRenderingContext2D, x: number, y: number, r: number, lift: number, playing: boolean, t: number) {
    const [cr, cg, cb] = TERRACOTTA
    g.fillStyle = `rgba(27,36,48,${0.18 / (1 + lift / r)})`
    g.beginPath()
    g.ellipse(x, y + 1, r * 0.7, r * 0.28, 0, 0, TAU)
    g.fill()

    const tip = y - lift
    const cy = tip - r * 2
    if (playing && !this.reduce) {
      const pulse = (t * 1.2) % 1
      g.strokeStyle = `rgba(${cr},${cg},${cb},${0.55 * (1 - pulse)})`
      g.lineWidth = 2
      g.beginPath()
      g.arc(x, cy, r * (1.2 + pulse * 1.6), 0, TAU)
      g.stroke()
    }
    g.fillStyle = `rgb(${cr},${cg},${cb})`
    g.strokeStyle = '#FFFFFF'
    g.lineWidth = Math.max(1.5, r * 0.28)
    g.beginPath()
    g.moveTo(x, tip)
    g.arc(x, cy, r, (5 * Math.PI) / 6, Math.PI / 6)
    g.closePath()
    g.fill()
    g.stroke()
    g.fillStyle = '#FFFFFF'
    g.beginPath()
    g.arc(x, cy, r * 0.38, 0, TAU)
    g.fill()
  }

  private drawSpot(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
    const pulse = this.reduce ? 0.5 : (t * 0.8) % 1
    g.strokeStyle = `rgba(196,92,62,${0.5 * (1 - pulse)})`
    g.lineWidth = 2
    g.beginPath()
    g.arc(x, y, 8 + pulse * 22, 0, TAU)
    g.stroke()
    g.fillStyle = 'rgba(196,92,62,.45)'
    g.beginPath()
    g.ellipse(x, y + 2, 9, 4, 0, 0, TAU)
    g.fill()
    g.fillStyle = '#C45C3E'
    g.strokeStyle = '#FFFFFF'
    g.lineWidth = 2.5
    g.beginPath()
    g.arc(x, y, 7, 0, TAU)
    g.fill()
    g.stroke()
  }
}
