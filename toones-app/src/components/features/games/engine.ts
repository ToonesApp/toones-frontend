import { angularDistance } from '../../lib/geo'
import type { GameItem, Geo } from './types'

export const ROUNDS = 5
export const ROUND_MS = 15_000
const BASE = 100
const SPEED_BONUS = 50
/** A pin this close keeps the streak alive. */
const NEAR_KM = 1000
/** A pin this far scores nothing. */
const FAR_KM = 4000
/** Five perfect instant answers. Keep in sync with toones-backend/src/models/GameScore.ts. */
export const MAX_SCORE = 1125

/** Difficulty of each round in order: easy first, hardest last. */
const RAMP = [1, 1, 2, 2, 3]

export type Answer = { picked: string | null; correct: boolean; points: number; km?: number }

/** UTC day, so the daily challenge turns over at the same moment for everyone. */
export const today = () => new Date().toISOString().slice(0, 10)

export function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Seeded random numbers (mulberry32), so one seed always deals the same rounds. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(list: readonly T[], rand: () => number) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Five rounds with rising difficulty and no repeated answer. */
export function pickRounds(items: readonly GameItem[], seed: number, needGeo = false): GameItem[] {
  const rand = rng(seed)
  const left = shuffle(needGeo ? items.filter((i) => i.reveal.geo) : items, rand)
  const used = new Set<string>()
  const rounds: GameItem[] = []
  for (const want of RAMP.slice(0, ROUNDS)) {
    const fresh = left.filter((i) => !used.has(i.answer))
    const pick = [...fresh].sort((a, b) => Math.abs(a.difficulty - want) - Math.abs(b.difficulty - want))[0]
    if (!pick) break
    left.splice(left.indexOf(pick), 1)
    used.add(pick.answer)
    rounds.push({ ...pick, options: shuffle(pick.options, rand) })
  }
  return rounds
}

export const dailySeed = (game: string, day = today()) => hash(`${game}:${day}`)

export const multiplier = (streak: number) => Math.min(2, 1 + streak * 0.25)

/** `closeness` is 1 for a right answer, 0 for a wrong one, and in between for a pin. */
export function points(closeness: number, msLeft: number, streak: number) {
  return Math.round((BASE + (SPEED_BONUS * Math.max(0, msLeft)) / ROUND_MS) * closeness * multiplier(streak))
}

export function kmBetween(a: Geo, b: Geo) {
  return angularDistance([a.lng, a.lat], [b.lng, b.lat]) * 6371
}

export function pinResult(guess: Geo, truth: Geo) {
  const km = kmBetween(guess, truth)
  return { km, correct: km <= NEAR_KM, closeness: Math.max(0, Math.min(1, (FAR_KM - km) / (FAR_KM - NEAR_KM))) }
}

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z ]/g, '').trim()

/** Typed answers ignore case and accents, and accept one full word of a longer name ("Mandarin" for "Mandarin Chinese"). */
export function typedMatch(input: string, answer: string) {
  const a = plain(answer)
  const i = plain(input)
  return i.length > 2 && (i === a || a.split(' ').includes(i))
}

export function shareText(title: string, answers: readonly Answer[], score: number, daily: boolean, url: string) {
  const marks = answers.map((a) => (a.correct ? '🟩' : a.points ? '🟨' : '🟥')).join('')
  return `TOONES ${title}${daily ? ` · Daily ${today()}` : ''}\n${marks} ${score} pts\n${url}`
}
