import { useEffect, useRef } from 'react'
import { fitCanvas, stepNotes } from '../../characters/clay'
import { notes } from './notes'

/** Full-page canvas above everything that draws the like notes. */
export function NotesLayer() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    let raf = 0
    let last = performance.now()
    let dirty = false
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!notes.list.length && !dirty) return
      const { g, w, h } = fitCanvas(c)
      if (!g) return
      g.clearRect(0, 0, w, h)
      notes.list = stepNotes(g, notes.list, dt, 0.8)
      dirty = notes.list.length > 0
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} className="feed-notes" aria-hidden="true" />
}
