import { type Look } from './avatar'
import { SPECIES, drawCharacter } from './clay'

const faceCache = new Map<string, string>()

/** Static portrait of a look as a data URL, for list avatars and option tiles. */
export function lookDataUrl(look: Look, px = 120) {
  const key = `${px}:${look.species}:${look.hat}:${look.glasses}:${look.outfit}:${look.facial}:${look.color}`
  let url = faceCache.get(key)
  if (!url) {
    const sp = SPECIES[look.species]
    const c = document.createElement('canvas')
    c.width = c.height = px
    const g = c.getContext('2d')
    if (!g) return ''
    const s = px / 120
    // Leave headroom for hats
    const k = Math.min((88 * s) / sp.w, (78 * s) / sp.h)
    drawCharacter(g, px / 2, px - 12 * s, k, sp, { look: { x: px / 2, y: px * 2 }, shadow: false, dress: look })
    url = c.toDataURL()
    faceCache.set(key, url)
  }
  return url
}
