import { useEffect, useRef } from 'react'
import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useNight } from '../../lib/storage'
import { POSITRON_STYLE, paint } from '../home/globe/mapStyle'

setWorkerUrl(workerUrl)

/** Static map tile centered on a Toone, in the globe's own style. */
export function MiniMap({ lon, lat }: { lon: number; lat: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [night] = useNight()
  const nightRef = useRef(night)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const map = new MapLibreMap({
      container: node,
      style: POSITRON_STYLE,
      center: [lon, lat],
      zoom: 9,
      interactive: false,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.on('style.load', () => paint(map, nightRef.current ? 1 : 0))
    return () => {
      mapRef.current = null
      map.remove()
    }
  }, [lon, lat])

  useEffect(() => {
    nightRef.current = night
    const map = mapRef.current
    if (map?.isStyleLoaded()) paint(map, night ? 1 : 0)
  }, [night])

  return <div ref={ref} className="minimap" />
}
