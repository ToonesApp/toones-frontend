import { prefersReducedMotion, spawnNote, type Note } from '../../characters/clay'
import { KEYS, read } from '../../lib/storage'

/** Notes in flight, drawn by `NotesLayer`. */
export const notes: { list: Note[] } = { list: [] }

/** Three music notes float up from a page point (a like). */
export function burstNotes(x: number, y: number) {
  if (prefersReducedMotion()) return
  const night = read(KEYS.night) === '1'
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const n = spawnNote(x, y - 10, { night, spread: 6 })
      n.vx = (i - 1) * 34
      n.life = 1.4
      n.glyph = ['♪', '♫', '♩'][i]
      notes.list.push(n)
    }, i * 120)
  }
}
