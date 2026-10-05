import { useEffect, useRef, type CSSProperties } from 'react'
import { useNight } from '../../lib/storage'
import {
  CharacterMotion,
  SPECIES,
  clamp,
  drawCharacter,
  fitCanvas,
  fitPlacement,
  prefersReducedMotion,
  spawnNote,
  stepNotes,
  type Note,
  type SpeciesId,
} from './clay'

export type Mood = 'idle' | 'happy' | 'oh' | 'talk' | 'sleep'

type ClayCharacterProps = {
  species: SpeciesId
  /** CSS px. Number for a square, or [width, height]. */
  size?: number | [number, number]
  mood?: Mood
  /** Hands over eyes. */
  cover?: boolean
  /** Pupils follow the pointer anywhere on the page. */
  followCursor?: boolean
  /** Hover wiggles and waves; click hops and plays notes. */
  interactive?: boolean
  idleWaves?: boolean
  /** Fraction of the box the character fills. */
  fill?: number
  className?: string
  style?: CSSProperties
}

/** One clay character on its own canvas. Scenes with many characters draw with `drawCharacter` directly. */
export function ClayCharacter({ species, size = 48, mood = 'idle', cover = false, followCursor = true, interactive = false, idleWaves = false, fill = 0.8, className, style }: ClayCharacterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [night] = useNight()
  const props = useRef({ mood, cover, followCursor, interactive, idleWaves, fill, night })

  useEffect(() => {
    props.current = { mood, cover, followCursor, interactive, idleWaves, fill, night }
  })

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const sp = SPECIES[species]
    const motion = new CharacterMotion()
    const reduce = prefersReducedMotion()
    const pointer = { x: -1e4, y: -1e4 }
    let notes: Note[] = []
    let hovered = false
    let coverAmt = props.current.cover ? 1 : 0
    let sleepAmt = props.current.mood === 'sleep' ? 1 : 0
    let nightAmt = props.current.night ? 1 : 0
    let nextZ = 0
    let t = 0
    let last = performance.now()
    let raf = 0
    let geom = { x: 0, by: 0, k: 1, cw: 0, chh: 0 }

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
    }
    const onClick = () => {
      if (!props.current.interactive) return
      if (!reduce) motion.jump(560)
      motion.happy = 1.2
      motion.wave = 1.2
      for (let i = 0; i < 3; i++) {
        setTimeout(() => notes.push(spawnNote(geom.x, geom.by - geom.chh - 4, { night: props.current.night, spread: geom.cw * 0.8 })), i * 110)
      }
    }
    window.addEventListener('pointermove', onMove)
    c.addEventListener('click', onClick)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      const p = props.current
      const { g, w, h } = fitCanvas(c)
      if (!g || !w || !h) return
      g.clearRect(0, 0, w, h)

      const { k, x, base } = fitPlacement(sp, w, h, p.fill)
      motion.step(dt, { idleWaves: p.idleWaves, reduce })

      const rate = Math.min(1, dt * 10)
      coverAmt += ((p.cover ? 1 : 0) - coverAmt) * rate
      sleepAmt += ((p.mood === 'sleep' ? 1 : 0) - sleepAmt) * Math.min(1, dt * (p.mood === 'sleep' ? 1.2 : 6))
      nightAmt = reduce ? (p.night ? 1 : 0) : clamp(nightAmt + Math.sign((p.night ? 1 : 0) - nightAmt) * (dt / 1.4))

      const r = c.getBoundingClientRect()
      const local = { x: pointer.x - r.left, y: pointer.y - r.top }
      if (p.interactive) {
        const over = Math.abs(local.x - x) < geom.cw / 2 && local.y > base - geom.chh && local.y < base
        if (over && !hovered && !reduce) {
          motion.bump(3)
          motion.wave = 1.2
        }
        hovered = over
        c.style.cursor = over ? 'pointer' : ''
      }

      if (sleepAmt > 0.6 && t > nextZ) {
        nextZ = t + 1.5 + Math.random()
        notes.push(spawnNote(x + geom.cw * 0.3, base - geom.chh - 4, { z: true }))
      }

      const breathe = reduce ? 0 : Math.sin(t * 1.6) * 0.012 + sleepAmt * (Math.sin(t * 1.1) * 0.025 - 0.03)
      const size = drawCharacter(g, x, base - motion.hop * k, k, sp, {
        look: p.followCursor && pointer.x > -1e3 ? local : null,
        blink: motion.blink,
        sleep: sleepAmt,
        cover: coverAmt,
        happy: p.mood === 'happy' || motion.happy > 0,
        oh: p.mood === 'oh',
        talk: p.mood === 'talk' ? Math.abs(Math.sin(t * 11)) : undefined,
        wave: motion.wave,
        squash: motion.s + breathe,
        night: smooth(nightAmt),
        t,
      })
      geom = { x, by: base, k, ...size }
      notes = stepNotes(g, notes, dt, clamp(k * 2, 0.5, 1))
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      c.removeEventListener('click', onClick)
    }
  }, [species])

  const [w, h] = Array.isArray(size) ? size : [size, size]
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: w, height: h, display: 'block', ...style }}
    />
  )
}

const smooth = (e: number) => e * e * (3 - 2 * e)
