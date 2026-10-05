/* The Earth drawn with d3 on a 2D canvas, matching Home's first MapLibre frame.
   Auth morphs its hill into it; Home keeps it on screen until the map has loaded. */

import { geoCircle, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo'
import { feature, mesh } from 'topojson-client'
import type { Feature, MultiLineString, MultiPolygon, Polygon } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import { clamp } from '../../components/characters/clay'
import { sunPosition } from '../../lib/geo'
import { HOME_START } from '../home/layout'

export type RGB = [number, number, number]
export type HandoffGeo = { land: Feature<MultiPolygon | Polygon>; borders: MultiLineString; grat: MultiLineString }

let loading: Promise<HandoffGeo> | null = null

export function loadHandoffGeo() {
  loading ??= import('world-atlas/countries-110m.json').then((mod) => {
    const topo = mod.default as unknown as Topology<{ countries: GeometryCollection; land: GeometryCollection }>
    return {
      land: feature(topo, topo.objects.land) as unknown as Feature<MultiPolygon | Polygon>,
      borders: mesh(topo, topo.objects.countries, (a, b) => a !== b),
      grat: geoGraticule10(),
    }
  })
  return loading
}

const mix = (a: RGB, b: RGB, u: number): RGB => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
const rgb = (a: RGB, alpha = 1) => `rgba(${a.map(Math.round).join(',')},${alpha})`

/* Same colors as the Positron palette in home/globe/mapStyle.ts */
const WATER: [RGB, RGB] = [[173, 210, 227], [22, 34, 63]]
const LAND: [RGB, RGB] = [[246, 244, 238], [62, 78, 118]]

type DrawOpts = {
  cx: number
  cy: number
  rx: number
  ry: number
  /** Day 0 → night 1. */
  night: number
  /** 0 = still the hill, 1 = the whole Earth. */
  reveal: number
  hill?: { color: RGB; alpha: number }
  geo: HandoffGeo | null
}

export function drawHandoffGlobe(g: CanvasRenderingContext2D, { cx, cy, rx, ry, night: e, reveal: q, hill, geo }: DrawOpts) {
  const R = rx
  const TAU = Math.PI * 2
  const landIn = clamp((q - 0.62) / 0.38)
  g.save()
  g.translate(cx, cy)
  g.scale(1, ry / rx)

  // Atmosphere halo and ocean
  g.globalAlpha = q
  const halo = g.createRadialGradient(0, 0, R * 0.96, 0, 0, R * 1.16)
  halo.addColorStop(0, e > 0.5 ? 'rgba(140,170,255,.3)' : 'rgba(255,255,255,.7)')
  halo.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = halo
  g.beginPath()
  g.arc(0, 0, R * 1.16, 0, TAU)
  g.fill()
  g.fillStyle = rgb(mix(WATER[0], WATER[1], e))
  g.beginPath()
  g.arc(0, 0, R, 0, TAU)
  g.fill()

  // The hill it grew out of
  if (hill && q < 1) {
    g.globalAlpha = 1 - q
    g.fillStyle = 'rgba(27,36,48,.06)'
    g.beginPath()
    g.arc(0, (8 * rx) / ry, R, 0, TAU)
    g.fill()
    g.fillStyle = rgb(hill.color, hill.alpha)
    g.beginPath()
    g.arc(0, 0, R, 0, TAU)
    g.fill()
  }
  g.globalAlpha = 1

  if (landIn > 0 && geo) {
    const proj = geoOrthographic().clipAngle(90).precision(0.4).scale(R).translate([0, 0]).rotate([-HOME_START[0], -HOME_START[1], 0])
    const path = geoPath(proj, g)
    const sun = sunPosition()
    const nightCap = geoCircle().center([sun.lon + 180, -sun.decl]).radius(90)()
    g.save()
    g.globalAlpha = landIn
    g.beginPath()
    g.arc(0, 0, R, 0, TAU)
    g.clip()
    g.beginPath()
    path(geo.grat)
    g.strokeStyle = e > 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.4)'
    g.lineWidth = 0.8
    g.stroke()
    g.beginPath()
    path(geo.land)
    g.fillStyle = rgb(mix(LAND[0], LAND[1], e))
    g.fill()
    g.beginPath()
    path(geo.borders)
    g.strokeStyle = e > 0.5 ? 'rgba(255,255,255,.14)' : 'rgba(27,36,48,.16)'
    g.setLineDash([3, 2])
    g.stroke()
    g.setLineDash([])
    g.beginPath()
    path(nightCap)
    g.fillStyle = `rgba(20,30,60,${0.13 + 0.12 * e})`
    g.fill()
    g.restore()
  }

  g.globalAlpha = q
  g.strokeStyle = e > 0.5 ? 'rgba(180,200,255,.25)' : 'rgba(255,255,255,.85)'
  g.lineWidth = 1.5
  g.beginPath()
  g.arc(0, 0, R, 0, TAU)
  g.stroke()
  g.restore()
}
