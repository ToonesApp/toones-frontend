import type { LngLat } from '../../lib/geo'

/** Globe center on Home's first frame: the Americas and Atlantic. The Auth hand-off globe uses the same view. */
export const HOME_START: LngLat = [-74, 36]

/** Panel state on first load; the hand-off globe targets the box it leaves free. */
export const initialPanelOpen = (W = window.innerWidth) => W >= 1100

/** HUD edges around the globe. The globe never sits under the HUD; the Auth → Home transition targets the same box. */
export function globeInsets(W: number, panelOpen: boolean) {
  const narrow = W < 900
  return {
    left: narrow ? 12 : panelOpen ? 400 : 84,
    right: narrow ? 12 : 84,
    top: narrow ? 120 : 64,
    bottom: (narrow ? 76 : 16) + 52,
  }
}

/** Whole-Earth circle inside the HUD-free box. */
export function globeTarget(W: number, H: number, panelOpen: boolean) {
  const p = globeInsets(W, panelOpen)
  const R = Math.max(70, Math.min((W - p.left - p.right) / 2, (H - p.top - p.bottom) / 2) - 8)
  return { cx: (p.left + W - p.right) / 2, cy: p.top + (H - p.top - p.bottom) / 2, R }
}

export const isNarrow = () => window.innerWidth < 900
