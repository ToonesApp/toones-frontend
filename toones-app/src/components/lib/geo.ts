import { geoArea, geoBounds, geoCentroid, geoContains, geoDistance } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry, MultiLineString, Polygon } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'

export type LngLat = [number, number]

/** [name, lon, lat, rank] — rank 1 = major city label. */
export const CITIES: readonly [string, number, number, 1 | 2][] = [
  ['New York', -74.006, 40.713, 1], ['Los Angeles', -118.244, 34.052, 1], ['Chicago', -87.63, 41.878, 2], ['Toronto', -79.383, 43.653, 1],
  ['Mexico City', -99.133, 19.433, 1], ['Washington', -77.037, 38.907, 2], ['Montreal', -73.567, 45.501, 2], ['Vancouver', -123.121, 49.283, 2],
  ['San Francisco', -122.419, 37.775, 2], ['Miami', -80.192, 25.762, 2], ['Havana', -82.366, 23.113, 2], ['Bogotá', -74.072, 4.711, 1],
  ['Lima', -77.043, -12.046, 1], ['São Paulo', -46.633, -23.55, 1], ['Rio de Janeiro', -43.173, -22.907, 2], ['Buenos Aires', -58.382, -34.604, 1],
  ['Santiago', -70.669, -33.449, 2], ['London', -0.128, 51.507, 1], ['Paris', 2.352, 48.857, 1], ['Madrid', -3.704, 40.417, 1],
  ['Lisbon', -9.139, 38.722, 2], ['Rome', 12.496, 41.903, 1], ['Berlin', 13.405, 52.52, 1], ['Amsterdam', 4.904, 52.368, 2],
  ['Stockholm', 18.069, 59.329, 2], ['Warsaw', 21.012, 52.23, 2], ['Vienna', 16.373, 48.208, 2], ['Athens', 23.728, 37.984, 2],
  ['Istanbul', 28.978, 41.008, 1], ['Moscow', 37.618, 55.756, 1], ['Kyiv', 30.523, 50.45, 2], ['Cairo', 31.236, 30.044, 1],
  ['Lagos', 3.379, 6.524, 1], ['Accra', -0.187, 5.604, 2], ['Nairobi', 36.822, -1.292, 1], ['Addis Ababa', 38.757, 9.03, 2],
  ['Johannesburg', 28.047, -26.204, 1], ['Cape Town', 18.424, -33.925, 2], ['Casablanca', -7.589, 33.573, 2], ['Dakar', -17.467, 14.716, 2],
  ['Kinshasa', 15.266, -4.442, 2], ['Dubai', 55.271, 25.205, 1], ['Riyadh', 46.675, 24.713, 2], ['Tehran', 51.389, 35.689, 2],
  ['Karachi', 67.01, 24.861, 2], ['Delhi', 77.209, 28.614, 1], ['Mumbai', 72.878, 19.076, 1], ['Bengaluru', 77.595, 12.972, 2],
  ['Dhaka', 90.413, 23.811, 2], ['Kathmandu', 85.324, 27.717, 2], ['Bangkok', 100.502, 13.756, 1], ['Singapore', 103.82, 1.352, 1],
  ['Jakarta', 106.845, -6.208, 1], ['Manila', 120.984, 14.599, 2], ['Hong Kong', 114.169, 22.319, 2], ['Shanghai', 121.474, 31.23, 1],
  ['Beijing', 116.407, 39.904, 1], ['Seoul', 126.978, 37.567, 1], ['Tokyo', 139.692, 35.69, 1], ['Osaka', 135.502, 34.694, 2],
  ['Taipei', 121.565, 25.033, 2], ['Sydney', 151.209, -33.869, 1], ['Melbourne', 144.963, -37.814, 2], ['Auckland', 174.763, -36.848, 2],
  ['Honolulu', -157.858, 21.307, 2], ['Anchorage', -149.9, 61.218, 2], ['Reykjavík', -21.942, 64.147, 2],
]

export const NEW_YORK: LngLat = [-74.006, 40.713]

/* ---- Countries (Natural Earth 110m via world-atlas, loaded on demand) ---- */

type Country = { name: string; feature: Feature<Geometry, { name: string }>; centroid: LngLat; bounds: [LngLat, LngLat]; area: number }

let countries: Country[] = []
let loading: Promise<Country[]> | null = null

export function loadCountries() {
  loading ??= import('world-atlas/countries-110m.json').then((mod) => {
    const topo = mod.default as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>
    const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>
    countries = fc.features
      .filter((f) => f.properties?.name)
      .map((f) => ({ name: f.properties.name, feature: f, centroid: geoCentroid(f) as LngLat, bounds: geoBounds(f) as [LngLat, LngLat], area: geoArea(f) }))
    return countries
  })
  return loading
}

export function countryAt(lon: number, lat: number) {
  return countries.find((c) => geoContains(c.feature, [lon, lat]))?.name ?? null
}

/** Nearest listed city within 120 km. */
export function nearCity(lon: number, lat: number) {
  let best: string | null = null
  let bestD = Infinity
  for (const [name, clon, clat] of CITIES) {
    const d = geoDistance([lon, lat], [clon, clat])
    if (d < bestD) {
      bestD = d
      best = name
    }
  }
  return bestD * 6371 < 120 ? best : null
}

export function placeName(lon: number, lat: number) {
  const country = countryAt(lon, lat)
  const city = nearCity(lon, lat)
  if (city && country) return `${city}, ${country}`
  return city ?? country ?? 'Open water'
}

export function coordText(lon: number, lat: number) {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`
}

/** Solar-ish local time from longitude, HH:MM. */
export function localTime(lon: number, now = Date.now()) {
  const d = new Date(now + Math.round(lon / 15) * 3600e3)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

export function angularDistance(a: LngLat, b: LngLat) {
  return geoDistance(a, b)
}

export type SearchResult = { kind: 'city' | 'country'; name: string; sub: string; center: LngLat; bounds?: [LngLat, LngLat] }

export function searchPlaces(query: string, limit = 6): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const score = (name: string) => (name.toLowerCase().startsWith(q) ? 0 : name.toLowerCase().includes(q) ? 1 : -1)
  const cities = CITIES.filter(([n]) => score(n) >= 0).map(([name, lon, lat, rank]) => ({
    r: { kind: 'city' as const, name, sub: countryAt(lon, lat) ?? 'City', center: [lon, lat] as LngLat },
    s: score(name) * 10 + rank,
  }))
  const lands = countries.filter((c) => score(c.name) >= 0).map((c) => ({
    r: { kind: 'country' as const, name: c.name, sub: 'Country', center: c.centroid, bounds: c.bounds },
    s: score(c.name) * 10 + 1.5,
  }))
  return [...cities, ...lands].sort((a, b) => a.s - b.s).slice(0, limit).map((x) => x.r)
}

/* ---- Overlays ---- */

/** Subsolar point: longitude and declination in degrees. */
export function sunPosition(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const doy = (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 864e5
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (doy + 10))
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60
  return { lon: -(hours - 12) * 15, decl }
}

/** The night half of Earth right now, as one polygon that never crosses the antimeridian. */
export function nightPolygon(date = new Date()): Feature<Polygon> {
  const sun = sunPosition(date)
  const sunLon = sun.lon
  const decl = Math.abs(sun.decl) < 0.1 ? (sun.decl < 0 ? -0.1 : 0.1) : sun.decl
  const rad = Math.PI / 180
  const line: LngLat[] = []
  for (let lon = -180; lon <= 180; lon += 2) {
    const lat = Math.atan(-Math.cos((lon - sunLon) * rad) / Math.tan(decl * rad)) / rad
    line.push([lon, lat])
  }
  const pole = decl > 0 ? -90 : 90
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [[[-180, pole], ...line, [180, pole], [-180, pole]]] },
  }
}

export function graticule(step = 10): Feature<MultiLineString> {
  const lines: LngLat[][] = []
  for (let lon = -180; lon < 180; lon += step) {
    const l: LngLat[] = []
    for (let lat = -80; lat <= 80; lat += 2) l.push([lon, lat])
    lines.push(l)
  }
  for (let lat = -80; lat <= 80; lat += step) {
    const l: LngLat[] = []
    for (let lon = -180; lon <= 180; lon += 2) l.push([lon, lat])
    lines.push(l)
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: lines } }
}
