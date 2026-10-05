import type { Map as MapLibreMap, SkySpecification, StyleSpecification } from 'maplibre-gl'
import { graticule, nightPolygon } from '../../../lib/geo'

/** OpenFreeMap: no API key, OSM data. */
export const POSITRON_STYLE = 'https://tiles.openfreemap.org/styles/positron'

/** Free OSM raster fallback if OpenFreeMap is unreachable. Attribution required. */
export const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

type RGBA = [number, number, number, number]

const hex = (h: string, a = 1): RGBA => {
  const n = Number.parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
}
const lerpRGBA = (a: RGBA, b: RGBA, e: number) => a.map((v, i) => v + (b[i] - v) * e) as RGBA
const css = (c: RGBA) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${+c[3].toFixed(3)})`
const mix = (a: RGBA, b: RGBA, e: number) => css(lerpRGBA(a, b, e))
const mixN = (a: number, b: number, t: number) => a + (b - a) * t

/** [property, day, night] per layer id (or id prefix ending in *). */
const PALETTE: [string, Parameters<MapLibreMap['setPaintProperty']>[1], RGBA, RGBA][] = [
  ['background', 'background-color', hex('#F6F4EE'), hex('#3E4E76')],
  ['water', 'fill-color', hex('#ADD2E3'), hex('#16223F')],
  ['waterway', 'line-color', hex('#ADD2E3'), hex('#16223F')],
  ['park', 'fill-color', hex('#DCE8D4', 0.6), hex('#4C6478', 0.45)],
  ['landcover_wood', 'fill-color', hex('#DCE8D4', 0.5), hex('#4C6478', 0.35)],
  ['landcover_ice_shelf', 'fill-color', hex('#FFFFFF'), hex('#5A6A92')],
  ['landcover_glacier', 'fill-color', hex('#FFFFFF'), hex('#5A6A92')],
  ['landuse_residential', 'fill-color', hex('#ECE8DF', 0.7), hex('#46567E', 0.6)],
  ['building', 'fill-color', hex('#E8E4DB'), hex('#4A5A82')],
  ['boundary_2', 'line-color', hex('#1B2430', 0.16), hex('#FFFFFF', 0.14)],
  ['boundary_disputed', 'line-color', hex('#1B2430', 0.16), hex('#FFFFFF', 0.14)],
  ['boundary_3', 'line-color', hex('#1B2430', 0.08), hex('#FFFFFF', 0.08)],
  ['*casing', 'line-color', hex('#E2DED5'), hex('#2C3A60')],
  ['highway_*', 'line-color', hex('#FFFFFF'), hex('#5B6B92')],
  ['label_*', 'text-color', hex('#5A6774'), hex('#A5B2C6')],
  ['label_*', 'text-halo-color', hex('#FFFFFF', 0.9), hex('#10172B', 0.9)],
  ['label_country_*', 'text-color', hex('#1B2430', 0.72), hex('#EAF0FA', 0.8)],
  ['water_name_*', 'text-color', hex('#5D8FAA'), hex('#7F98C4')],
  ['water_name_*', 'text-halo-color', hex('#FFFFFF', 0.6), hex('#10172B', 0.6)],
  ['toones-graticule', 'line-color', hex('#FFFFFF', 0.4), hex('#FFFFFF', 0.06)],
  ['toones-night', 'fill-color', hex('#141E3C', 0.13), hex('#141E3C', 0.25)],
]

const match = (pattern: string, id: string) => {
  if (pattern.startsWith('*')) return id.endsWith(pattern.slice(1))
  if (pattern.endsWith('*')) return id.startsWith(pattern.slice(0, -1)) && !id.endsWith('casing')
  return id === pattern
}

export const LABEL_LAYER = (id: string) => /^(label_|water_name|waterway_line_label|highway-name|highway-shield|road_shield|airport)/.test(id)
export const BORDER_LAYER = (id: string) => id.startsWith('boundary_')

/** Adds TOONES overlays and type tweaks once the base style has loaded. */
export function decorate(map: MapLibreMap) {
  const layers = map.getStyle().layers ?? []
  const firstSymbol = layers.find((l) => l.type === 'symbol')?.id
  const firstBoundary = layers.find((l) => BORDER_LAYER(l.id))?.id ?? firstSymbol

  if (!map.getSource('toones-graticule')) map.addSource('toones-graticule', { type: 'geojson', data: graticule() })
  if (!map.getLayer('toones-graticule')) {
    map.addLayer({ id: 'toones-graticule', type: 'line', source: 'toones-graticule', paint: { 'line-width': 0.8 } }, firstBoundary)
  }
  if (!map.getSource('toones-night')) map.addSource('toones-night', { type: 'geojson', data: nightPolygon() })
  if (!map.getLayer('toones-night')) {
    map.addLayer({ id: 'toones-night', type: 'fill', source: 'toones-night', paint: { 'fill-antialias': false } }, firstSymbol)
  }

  for (const l of layers) {
    if (l.id === 'boundary_2' || l.id === 'boundary_disputed') map.setPaintProperty(l.id, 'line-dasharray', [3, 2])
    if (l.id.startsWith('label_country')) {
      map.setLayoutProperty(l.id, 'text-transform', 'uppercase')
      map.setLayoutProperty(l.id, 'text-letter-spacing', 0.16)
    }
  }
}

export function refreshNight(map: MapLibreMap) {
  const src = map.getSource('toones-night')
  if (src && 'setData' in src) (src as { setData: (d: unknown) => void }).setData(nightPolygon())
}

/** Applies the day → night palette at e = 0..1. */
export function paint(map: MapLibreMap, e: number) {
  const layers = map.getStyle().layers ?? []
  for (const l of layers) {
    for (const [pattern, prop, day, night] of PALETTE) {
      if (!match(pattern, l.id)) continue
      const kind = prop.split('-')[0]
      if (kind !== l.type && !(kind === 'text' && l.type === 'symbol')) continue
      map.setPaintProperty(l.id, prop, mix(day, night, e))
    }
  }
}

export function setVisible(map: MapLibreMap, test: (id: string) => boolean, on: boolean) {
  for (const l of map.getStyle().layers ?? []) {
    if (test(l.id)) map.setLayoutProperty(l.id, 'visibility', on ? 'visible' : 'none')
  }
}

/** 0 = far globe, 1 = street-level map. */
export function zoomDepth(zoom: number) {
  return Math.min(1, Math.max(0, (zoom - 2.2) / 9.5))
}

/** Atmosphere blooms when zoomed out and clears as the globe flattens into a map. */
export function skyFor(zoom: number, e: number): SkySpecification {
  const t = zoomDepth(zoom)
  const byZoom = (far: string, near: string, night: string) => mix(lerpRGBA(hex(far), hex(near), t), hex(night), e)
  return {
    'atmosphere-blend': mixN(0.78, 0.06, t) * (1 - 0.4 * e),
    'sky-color': byZoom('#5E9BC4', '#C9D7E6', '#0C1226'),
    'horizon-color': byZoom('#CFE4F2', '#E7EEF5', '#1E2A4C'),
    'fog-color': byZoom('#C5DBEB', '#E8EEF4', '#1E2A4C'),
    'sky-horizon-blend': mixN(0.48, 0.82, t),
    'horizon-fog-blend': 0.88,
    'fog-ground-blend': mixN(0.28, 0.72, t),
  }
}
