import type { Look } from '../characters/avatar'
import { KEYS, read, write } from './storage'

/** Override per-environment; the default matches the backend's own PORT default. */
const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '')

export type ApiUser = {
  id: string
  email: string
  username: string
  displayName: string
  xp: number
  level: number
  /** The saved character, or null until they make one. */
  look: Look | null
  createdAt: string
}

export type AuthResult = { token: string; user: ApiUser }

/**
 * Mirrors POST /auth/register. Password is 8+ chars. Username is `[a-z0-9_]{3,24}`;
 * when omitted the server generates one from the email.
 */
export type RegisterInput = {
  email: string
  username?: string
  displayName: string
  password: string
}

/** Mirrors POST /auth/login. The server matches `emailOrUsername` against either field. */
export type LoginInput = {
  emailOrUsername: string
  password: string
}

/** Carries the HTTP status so callers can tell 401 (bad credentials) from 409 (taken) or 503 (no DB). */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response

  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      // FormData sets its own multipart boundary
      headers: init?.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError('Cannot reach the server.', 0)
  }

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiError(body?.error ?? `Request failed (${res.status}).`, res.status)
  }

  return body as T
}

export function getToken(): string | null {
  return read(KEYS.token)
}

export function setToken(token: string | null) {
  write(KEYS.token, token)
}

export function register(input: RegisterInput): Promise<AuthResult> {
  return request<AuthResult>('/auth/register', { method: 'POST', body: JSON.stringify(input) })
}

export function login(input: LoginInput): Promise<AuthResult> {
  return request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify(input) })
}

/** Resolves the signed-in user from the stored token. */
export async function me(): Promise<ApiUser> {
  const token = getToken()
  if (!token) throw new ApiError('Not signed in.', 401)

  const body = await request<{ user: ApiUser }>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })

  return body.user
}

function authHeader(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** PUT /auth/me/look (signed in): saves the character. 403 when it uses items the user hasn't unlocked. */
export async function saveLook(look: Look): Promise<ApiUser> {
  const body = await request<{ user: ApiUser }>('/auth/me/look', { method: 'PUT', body: JSON.stringify({ look }), headers: authHeader() })
  return body.user
}

export type SoundCategory = 'nature' | 'language' | 'culture' | 'music' | 'city'

/** Mirrors the sound objects returned by /sounds. */
export type ApiSound = {
  id: string
  title: string
  description: string
  category: SoundCategory
  tags: string[]
  durationSec: number
  lon: number
  lat: number
  placeName: string
  playCount: number
  audioUrl: string
  createdAt: string
  author: { id: string; username: string; displayName: string; look: Look | null } | null
  mine: boolean
  listened: boolean
}

/** GET /sounds: newest first. With a stored token the server also fills `mine` and `listened`. */
export function getSounds(query: { limit?: number; category?: SoundCategory[] } = {}) {
  const params = new URLSearchParams()
  if (query.limit) params.set('limit', String(query.limit))
  if (query.category?.length) params.set('category', query.category.join(','))
  const qs = params.toString() ? `?${params}` : ''
  return request<{ sounds: ApiSound[]; nextBefore: string | null }>(`/sounds${qs}`, { headers: authHeader() })
}

export type UploadInput = {
  audio: Blob
  title: string
  category: SoundCategory
  lon: number
  lat: number
  durationSec: number
  placeName?: string
  description?: string
}

/** POST /sounds (signed in): the recording plus where it was made. Awards drop XP. */
export function uploadSound(input: UploadInput) {
  const form = new FormData()
  const ext = input.audio.type.includes('ogg') ? 'ogg' : input.audio.type.includes('mp4') ? 'm4a' : 'webm'
  form.set('audio', input.audio, `toone.${ext}`)
  form.set('title', input.title)
  form.set('category', input.category)
  form.set('lon', String(input.lon))
  form.set('lat', String(input.lat))
  form.set('durationSec', String(input.durationSec))
  if (input.placeName) form.set('placeName', input.placeName)
  if (input.description) form.set('description', input.description)
  return request<{ sound: ApiSound; xp: number; level: number }>('/sounds', { method: 'POST', body: form, headers: authHeader() })
}

/** POST /sounds/:id/listen (signed in): the first listen per user earns XP. */
export function recordListen(id: string) {
  return request<{ firstListen: boolean; playCount: number; xp: number; level: number }>(`/sounds/${id}/listen`, { method: 'POST', headers: authHeader() })
}

export function health(): Promise<{ ok: boolean; service: string }> {
  return request<{ ok: boolean; service: string }>('/health')
}