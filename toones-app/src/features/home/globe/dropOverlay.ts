import type { Map as MapLibreMap } from 'maplibre-gl'
import {
  CATEGORY_SPECIES,
  CharacterMotion,
  SPECIES,
  clamp,
  drawCharacter,
  fitCanvas,
  prefersReducedMotion,
  spawnNote,
  stepNotes,
  type Note,
} from '../../../components/characters/clay'
import { angularDistance, type LngLat } from '../../../lib/geo'
import { live, type Drop, type Spot } from '../homeStore'

type Hit = { id: string; x: number; y: number; hw: number; hh: number }

const backOut = (p: number) => {
  const s = 1.70158
  p -= 1
  return p * p * ((s + 1) * p + s) + 1
}

/** Draws drop characters, the chosen-spot pin and notes on a canvas above the map. */
export class DropOverlay {
  private canvas: HTMLCanvasElement
  private motions = new Map<string, CharacterMotion>()
  private notes: Note[] = []
  private hits: Hit[] = []
  private reduce = prefersReducedMotion()
  private burstDone = new Set<string>()
  pointer = { x: -1e4, y: -1e4, at: -1e4 }

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
    if (m && !this.reduce) m.jump(320)
    if (h) for (let i = 0; i < 3; i++) setTimeout(() => this.notes.push(spawnNote(h.x, h.y - h.hh - 4, { spread: h.hw })), i * 110)
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
    const zoom = map.getZoom()
    const r = clamp(11 * 2 ** (0.45 * (zoom - opts.fitZoom)), 11, 30)
    const happy = now < live.happyUntil
    const recentPointer = now - this.pointer.at < 1500

    const spotXY = opts.spot ? map.project([opts.spot.lon, opts.spot.lat]) : null
    const playing = opts.playingId ? opts.drops.find((d) => d.id === opts.playingId) : null
    const playXY = playing ? map.project([playing.lon, playing.lat]) : null
    const look = recentPointer ? this.pointer : spotXY ?? playXY ?? null

    // Far-side drops first so nearer ones overlap them
    const placed = opts.drops
      .map((d) => ({ d, dist: angularDistance(center, [d.lon, d.lat]) }))
      .filter((x) => x.dist < 1.5)
      .sort((a, b) => b.dist - a.dist)

    this.hits = []
    for (const { d, dist } of placed) {
      const alpha = clamp((1.5 - dist) / 0.22)
      const p = map.project([d.lon, d.lat])
      if (p.x < -60 || p.y < -60 || p.x > w + 60 || p.y > h + 80) continue
      const sp = SPECIES[CATEGORY_SPECIES[d.cat]]
      const k = (r * 2.5) / Math.sqrt(sp.w * sp.h)

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
        for (let i = 0; i < 4; i++) setTimeout(() => this.notes.push(spawnNote(p.x, p.y - sp.h * k, { night: opts.night > 0.5 })), i * 120)
      }

      const isPlaying = d.id === opts.playingId
      const level = live.recording ? live.level : isPlaying ? live.level : live.level * 0.4
      const bounce = this.reduce ? 0 : level * 10 * k
      g.globalAlpha = alpha
      const size = drawCharacter(g, p.x, p.y - m.hop * k - bounce, k, sp, {
        look,
        blink: m.blink,
        happy: happy || m.happy > 0,
        talk: isPlaying ? Math.abs(Math.sin(opts.t * 11)) * (0.4 + level) : undefined,
        dance: level,
        squash: m.s,
        scale: pop,
        night: opts.night,
        t: opts.t,
      })
      g.globalAlpha = 1
      if (alpha > 0.4) this.hits.push({ id: d.id, x: p.x, y: p.y - size.chh / 2, hw: size.cw / 2 + 6, hh: size.chh / 2 + 6 })
    }

    if (spotXY) this.drawPin(g, spotXY.x, spotXY.y, opts.t)
    this.notes = stepNotes(g, this.notes, opts.dt, 0.8)
  }

  private drawPin(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
    const pulse = this.reduce ? 0.5 : (t * 0.8) % 1
    g.strokeStyle = `rgba(196,92,62,${0.5 * (1 - pulse)})`
    g.lineWidth = 2
    g.beginPath()
    g.arc(x, y, 8 + pulse * 22, 0, Math.PI * 2)
    g.stroke()
    g.fillStyle = 'rgba(196,92,62,.45)'
    g.beginPath()
    g.ellipse(x, y + 2, 9, 4, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#C45C3E'
    g.strokeStyle = '#FFFFFF'
    g.lineWidth = 2.5
    g.beginPath()
    g.arc(x, y, 7, 0, Math.PI * 2)
    g.fill()
    g.stroke()
  }
}
