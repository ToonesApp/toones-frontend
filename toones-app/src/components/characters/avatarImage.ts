import { backgroundStops, type Look } from './avatar'
import { SPECIES, drawCharacter } from './clay'

const faceCache = new Map<string, string>()

/** Static portrait of a look as a data URL, for list avatars and option tiles. */
export function lookDataUrl(look: Look, px = 120) {
  const key = `${px}:${JSON.stringify(look)}`
  let url = faceCache.get(key)
  if (!url) {
    const sp = SPECIES[look.species]
    const c = document.createElement('canvas')
    c.width = c.height = px
    const g = c.getContext('2d')
    if (!g) return ''
    const stops = backgroundStops(look.bg)
    if (stops) {
      const grad = g.createLinearGradient(0, 0, px * 0.17, px)
      grad.addColorStop(0, stops[0])
      grad.addColorStop(1, stops[1])
      g.fillStyle = grad
      g.fillRect(0, 0, px, px)
    }
    const s = px / 120
    // Leave headroom for hats and hair
    const k = Math.min((84 * s) / sp.w, (74 * s) / sp.h)
    drawCharacter(g, px / 2, px - 12 * s, k, sp, { look: { x: px / 2, y: px * 2 }, shadow: false, dress: look })
    url = c.toDataURL()
    faceCache.set(key, url)
  }
  return url
}
