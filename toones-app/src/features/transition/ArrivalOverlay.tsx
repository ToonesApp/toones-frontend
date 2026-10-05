import { useEffect, useRef } from 'react'
import { CATEGORIES, CATEGORY_SPECIES, SPECIES, clamp, drawCharacter, fitCanvas, fitPlacement, lerp, spawnNote, stepNotes, type Note } from '../../components/characters/clay'
import { useNight } from '../../lib/storage'
import { useHome } from '../home/homeStore'
import { globeTarget } from '../home/layout'
import { useArrival } from './arrivalStore'
import { drawHandoffGlobe, loadHandoffGeo, type HandoffGeo } from './handoffGlobe'

const FLIGHT = 0.85
const STAGGER = 0.14
const SQUASH = 0.7
const K0 = 0.4
/** Seconds the d3 globe waits for MapLibre before fading anyway. */
const MAP_WAIT = 5

/** Home's first seconds after sign-in: the Auth end frame holds until the map is up, and the cast falls into the rail. */
export function ArrivalOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [night] = useNight()
  const nightRef = useRef(night)

  useEffect(() => {
    nightRef.current = night
  })

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    let geo: HandoffGeo | null = null
    void loadHandoffGeo().then((g) => (geo = g))
    const start = performance.now()
    let last = start
    let raf = 0
    let mapAt: number | null = null
    let notes: Note[] = []
    const noted = new Set<number>()
    const landed = new Set<number>()

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const el = (now - start) / 1000
      const { g, w: W, h: H } = fitCanvas(c)
      if (!g || !W || !H) return
      g.clearRect(0, 0, W, H)
      const e = nightRef.current ? 1 : 0

      const home = useHome.getState()
      if (mapAt == null && (home.globe || el > MAP_WAIT)) mapAt = el
      const globeAlpha = mapAt == null ? 1 : 1 - clamp((el - mapAt - 0.15) / 0.4)
      if (globeAlpha > 0) {
        const T = globeTarget(W, H, home.panelOpen)
        g.globalAlpha = globeAlpha
        drawHandoffGlobe(g, { cx: T.cx, cy: T.cy, rx: T.R, ry: T.R, night: e, reveal: 1, geo })
        g.globalAlpha = 1
      }

      CATEGORIES.forEach((cat, i) => {
        if (landed.has(i)) return
        const p = clamp((el - 0.1 - i * STAGGER) / FLIGHT)
        if (p <= 0) return
        const cell = document.querySelector(`.home-rail__cell[data-cat="${cat}"] canvas`)
        if (!cell) return
        const r = cell.getBoundingClientRect()
        const sp = SPECIES[CATEGORY_SPECIES[cat]]
        const fit = fitPlacement(sp, r.width, r.height, 0.86)
        const tx = r.left + fit.x
        const ty = r.top + fit.base
        const lt = el - 0.1 - i * STAGGER - FLIGHT
        if (lt >= SQUASH) {
          landed.add(i)
          useArrival.getState().land(cat)
          return
        }
        let x = tx
        let y = ty
        let k = fit.k
        let rot = 0
        let squash = 0
        if (p < 1) {
          const x0 = tx + W * 0.18 + i * 60
          const y0 = -sp.h * K0 - 20
          x = lerp(x0, tx, 1 - (1 - p) ** 2)
          y = lerp(y0, ty, p * p)
          k = lerp(K0, fit.k, p * p)
          rot = (1 - p) * (i % 2 ? 2.2 : -2.2)
        } else {
          squash = -Math.sin(lt * 15) * 0.28 * (1 - lt / SQUASH)
          if (!noted.has(i)) {
            noted.add(i)
            for (let n = 0; n < 2; n++) notes.push(spawnNote(tx, ty - sp.h * fit.k - 4, { night: e > 0.5, spread: sp.w * fit.k * 0.8 }))
          }
        }
        drawCharacter(g, x, y, k, sp, { happy: true, rot, squash, night: e, shadow: false, t: el })
      })
      notes = stepNotes(g, notes, dt, 0.6)

      if (landed.size === CATEGORIES.length && globeAlpha <= 0 && !notes.length) {
        cancelAnimationFrame(raf)
        useArrival.getState().end()
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvasRef} className="arrival-overlay" aria-hidden="true" />
}
