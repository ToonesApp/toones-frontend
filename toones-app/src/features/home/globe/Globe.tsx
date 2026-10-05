import { useEffect, useRef } from 'react'
import { AttributionControl, Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { clamp, prefersReducedMotion, smoothstep } from '../../../components/characters/clay'
import { countryAt, loadCountries, nearCity } from '../../../lib/geo'
import { useNight } from '../../../lib/storage'
import { useHome, type GlobeApi } from '../homeStore'
import { HOME_START, globeInsets, globeTarget } from '../layout'
import { togglePlayback } from '../player'
import { DropOverlay } from './dropOverlay'
import { BORDER_LAYER, LABEL_LAYER, OSM_RASTER_STYLE, POSITRON_STYLE, decorate, paint, refreshNight, setVisible, skyFor } from './mapStyle'
import './globe.css'

// MapLibre resolves its worker next to its own module, which Vite's dep pre-bundling moves.
setWorkerUrl(workerUrl)

const SPIN_DEG_PER_S = 4
const IDLE_MS = 4000
const MAX_ZOOM = 18
/** Below this zoom, wheel zoom stays centered so the globe doesn't skid sideways. */
const CENTERED_WHEEL_BELOW = 5.2

export function Globe() {
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const styledRef = useRef(false)
  const nightRef = useRef(false)
  const [night] = useNight()
  const panelOpen = useHome((s) => s.panelOpen)
  const layers = useHome((s) => s.layers)
  const fitRef = useRef<{ recompute: () => number } | null>(null)

  useEffect(() => {
    nightRef.current = night
  }, [night])

  useEffect(() => {
    const node = containerRef.current
    const overlayCanvas = overlayRef.current
    if (!node || !overlayCanvas) return
    const reduce = prefersReducedMotion()

    const map = new MapLibreMap({
      container: node,
      style: POSITRON_STYLE,
      center: HOME_START,
      zoom: 1.6,
      maxZoom: MAX_ZOOM,
      attributionControl: false,
      fadeDuration: 280,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      canvasContextAttributes: { antialias: true },
    })
    mapRef.current = map
    map.setPadding(globeInsets(node.clientWidth, useHome.getState().panelOpen))
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left')

    const overlay = new DropOverlay(overlayCanvas)
    let fitZoom = 1.6
    let nightLevel = nightRef.current ? 1 : 0
    let painted = -1
    let lastInteract = performance.now()
    let lastLabel = ''
    let skyFrame = 0

    const touch = () => {
      lastInteract = performance.now()
    }
    const pitchFor = (z: number) => 32 * smoothstep(clamp((z - fitZoom - 2.5) / 3))
    const e = () => smoothstep(nightLevel)

    /** Pixel radius of the globe's silhouette right now. The camera has perspective, so the edge sits
        short of 90° from center: take the farthest projected point along the great circle heading east. */
    const radiusNow = () => {
      const c = map.getCenter()
      const a = map.project(c)
      const rad = Math.PI / 180
      const phi = c.lat * rad
      let best = 0
      for (let deg = 50; deg <= 90; deg += 0.5) {
        const d = deg * rad
        const lat2 = Math.asin(Math.sin(phi) * Math.cos(d))
        const lon2 = c.lng * rad + Math.atan2(Math.sin(d) * Math.cos(phi), Math.cos(d) - Math.sin(phi) * Math.sin(lat2))
        const b = map.project([lon2 / rad, lat2 / rad])
        best = Math.max(best, Math.hypot(a.x - b.x, a.y - b.y))
      }
      return best
    }

    /** Sphere radius in px for a silhouette radius: the camera sits `f` px from the near surface,
        so the silhouette is f·r / √(f² + 2fr) rather than r, and zoom only scales r. */
    const sphereRadius = (silhouette: number) => {
      const f = node.clientHeight / 2 / Math.tan((map.getVerticalFieldOfView() * Math.PI) / 360)
      return (silhouette * silhouette + silhouette * Math.hypot(silhouette, f)) / f
    }

    const recomputeFit = () => {
      const { R } = globeTarget(node.clientWidth, node.clientHeight, useHome.getState().panelOpen)
      const z = map.getZoom()
      const now = radiusNow()
      const next = z + Math.log2(sphereRadius(R) / sphereRadius(now))
      if (z < 8 && map.getProjection()?.type === 'globe' && now > 1 && Number.isFinite(next)) fitZoom = clamp(next, -2, MAX_ZOOM)
      map.setMinZoom(fitZoom + Math.log2(0.75))
      return fitZoom
    }
    fitRef.current = { recompute: recomputeFit }

    const applyZoomFeel = () => {
      const z = map.getZoom()
      map.setSky(skyFor(z, e()))
      if (z < CENTERED_WHEEL_BELOW) map.scrollZoom.enable({ around: 'center' })
      else map.scrollZoom.enable()
    }

    const updateLooking = () => {
      const c = map.getCenter().wrap()
      const country = countryAt(c.lng, c.lat)
      const city = map.getZoom() > fitZoom + 1.3 ? nearCity(c.lng, c.lat) : null
      const label = city && country ? `${city}, ${country}` : (city ?? country ?? 'Open water')
      if (label !== lastLabel) {
        lastLabel = label
        useHome.getState().setLooking(c.lng, c.lat, label)
      }
    }

    const applyLayers = () => {
      if (!styledRef.current) return
      const l = useHome.getState().layers
      setVisible(map, LABEL_LAYER, l.labels)
      setVisible(map, BORDER_LAYER, l.borders)
      if (map.getLayer('toones-night')) map.setLayoutProperty('toones-night', 'visibility', l.sun ? 'visible' : 'none')
    }

    const onStyle = () => {
      map.setProjection({ type: 'globe' })
      map.scrollZoom.setWheelZoomRate(1 / 420)
      map.scrollZoom.setZoomRate(1 / 90)
      if (map.getLayer('water')) decorate(map)
      styledRef.current = true
      painted = -1
      applyLayers()
      applyZoomFeel()
    }

    map.on('style.load', onStyle)
    map.once('load', () => {
      node.querySelector('.maplibregl-compact-show')?.classList.remove('maplibregl-compact-show')
      map.jumpTo({ zoom: recomputeFit() })
      applyZoomFeel()
      useHome.getState().setGlobe(api)
      void loadCountries().then(updateLooking)
    })
    const fallback = window.setTimeout(() => {
      if (!styledRef.current) map.setStyle(OSM_RASTER_STYLE)
    }, 8000)

    map.on('zoom', () => {
      if (skyFrame) return
      skyFrame = requestAnimationFrame(() => {
        skyFrame = 0
        applyZoomFeel()
      })
    })
    map.on('zoomend', (ev) => {
      if (!('originalEvent' in ev) || !ev.originalEvent) return
      const want = pitchFor(map.getZoom())
      if (Math.abs(want - map.getPitch()) > 1) map.easeTo({ pitch: want, duration: 400 })
    })
    map.on('moveend', updateLooking)

    map.on('click', (ev) => {
      touch()
      const id = overlay.hitTest(ev.point)
      if (id) {
        const drop = useHome.getState().drops.find((d) => d.id === id)
        overlay.hop(id)
        if (drop) togglePlayback(drop)
        return
      }
      const p = ev.lngLat.wrap()
      useHome.getState().selectSpot(p.lng, p.lat)
    })
    map.on('mousemove', (ev) => {
      overlay.pointer = { x: ev.point.x, y: ev.point.y, at: performance.now() }
      map.getCanvas().style.cursor = overlay.hitTest(ev.point) ? 'pointer' : ''
    })

    const onKey = (ev: KeyboardEvent) => {
      touch()
      if (ev.key === 'Enter' && ev.target === map.getCanvas()) {
        const c = map.getCenter().wrap()
        useHome.getState().selectSpot(c.lng, c.lat)
      }
    }
    node.addEventListener('pointerdown', touch)
    node.addEventListener('wheel', touch, { passive: true })
    node.addEventListener('keydown', onKey)

    const resize = new ResizeObserver(() => {
      const wasFit = Math.abs(map.getZoom() - fitZoom) < 0.05
      map.resize()
      map.setPadding(globeInsets(node.clientWidth, useHome.getState().panelOpen))
      const z = recomputeFit()
      if (wasFit) map.jumpTo({ zoom: z })
    })
    resize.observe(node)

    const nightTimer = window.setInterval(() => refreshNight(map), 60_000)

    const api: GlobeApi = {
      flyTo: (center, zoom) => {
        touch()
        const z = zoom ?? map.getZoom()
        map.flyTo({ center, zoom: z, pitch: pitchFor(z), duration: reduce ? 0 : 1100, essential: true })
      },
      fitBounds: ([sw, ne]) => {
        touch()
        const east = ne[0] < sw[0] ? ne[0] + 360 : ne[0]
        map.fitBounds([sw, [east, ne[1]]], { duration: reduce ? 0 : 1100, maxZoom: 6, pitch: 0, padding: 24 })
      },
      zoomBy: (delta) => {
        touch()
        const z = clamp(map.getZoom() + delta, map.getMinZoom(), MAX_ZOOM)
        map.easeTo({ zoom: z, pitch: pitchFor(z), duration: reduce ? 0 : 300 })
      },
      wholeEarth: () => {
        touch()
        map.easeTo({ zoom: fitZoom, pitch: 0, duration: reduce ? 0 : 900 })
      },
      center: () => {
        const c = map.getCenter().wrap()
        return [c.lng, c.lat]
      },
      zoom: () => map.getZoom(),
      fitZoom: () => fitZoom,
    }

    let raf = 0
    let last = performance.now()
    let t = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt

      const target = nightRef.current ? 1 : 0
      nightLevel = reduce ? target : clamp(nightLevel + Math.sign(target - nightLevel) * (dt / 1.4))
      if (styledRef.current && painted !== nightLevel) {
        paint(map, e())
        map.setSky(skyFor(map.getZoom(), e()))
        painted = nightLevel
      }

      const s = useHome.getState()
      const idle = now - lastInteract > IDLE_MS
      if (styledRef.current && idle && !reduce && s.layers.spin && !s.spot && !s.playing && !s.recordOpen && map.getZoom() < fitZoom + Math.log2(1.6) && !map.isMoving()) {
        const c = map.getCenter()
        map.setCenter([c.lng - SPIN_DEG_PER_S * dt, c.lat])
      }

      const visible = s.drops.filter((d) => s.visible.includes(d.cat))
      overlay.draw(map, { drops: visible, spot: s.spot, playingId: s.playing?.id ?? null, night: e(), fitZoom, dt, t })
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(skyFrame)
      window.clearTimeout(fallback)
      window.clearInterval(nightTimer)
      resize.disconnect()
      node.removeEventListener('pointerdown', touch)
      node.removeEventListener('wheel', touch)
      node.removeEventListener('keydown', onKey)
      useHome.getState().setGlobe(null)
      styledRef.current = false
      fitRef.current = null
      mapRef.current = null
      map.remove()
    }
  }, [])

  // Panel open/close resizes the HUD-free box; keep a whole-Earth view fitted to it.
  useEffect(() => {
    const map = mapRef.current
    const fit = fitRef.current
    if (!map || !fit) return
    const node = map.getContainer()
    const before = useHome.getState().globe?.fitZoom() ?? map.getZoom()
    const wasFit = Math.abs(map.getZoom() - before) < 0.05
    const padding = globeInsets(node.clientWidth, panelOpen)
    const z = fit.recompute()
    map.easeTo({ padding, ...(wasFit ? { zoom: z } : {}), duration: prefersReducedMotion() ? 0 : 300 })
  }, [panelOpen])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !styledRef.current) return
    setVisible(map, LABEL_LAYER, layers.labels)
    setVisible(map, BORDER_LAYER, layers.borders)
    if (map.getLayer('toones-night')) map.setLayoutProperty('toones-night', 'visibility', layers.sun ? 'visible' : 'none')
  }, [layers])

  return (
    <div className="globe">
      <div ref={containerRef} className="globe-map" tabIndex={-1} aria-label="Globe. Drag to spin, scroll to zoom, click to choose a spot." />
      <canvas ref={overlayRef} className="globe-overlay" aria-hidden="true" />
    </div>
  )
}
