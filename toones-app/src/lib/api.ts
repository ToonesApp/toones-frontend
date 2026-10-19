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
      // FormData sets its own multipart boundary, so only JSON bodies get a Content-Type.
      headers: { ...(typeof init?.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
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

/** Exchanges a Google ID token for a Toones session. Creates the account on first use. */
export function googleLogin(credential: string): Promise<AuthResult> {
  return request<AuthResult>('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) })
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

/** A sound as returned by the feed. `category` is lowercase on the wire. */
export type ApiSound = {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  durationSec: number
  lon: number
  lat: number
  placeName: string
  playCount: number
  /** Absolute URL of the audio file. */
  audioUrl: string
  createdAt: string
  author: { id: string; username: string; displayName: string } | null
  mine: boolean
  listened: boolean
}

export type CreateSoundInput = {
  audio: Blob
  title: string
  category: string
  lon: number
  lat: number
  durationSec: number
  placeName?: string
}

function authHeader(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Uploads a recorded clip and creates the sound. Also returns the user's new XP total. */
export function createSound(input: CreateSoundInput): Promise<{ sound: ApiSound; xp: number; level: number }> {
  const form = new FormData()
  form.append('title', input.title)
  form.append('category', input.category.toLowerCase())
  form.append('lon', String(input.lon))
  form.append('lat', String(input.lat))
  form.append('durationSec', String(input.durationSec))
  if (input.placeName) form.append('placeName', input.placeName)
  form.append('audio', input.audio, 'clip')

  // Generous timeout: a sleeping free-tier server can take about a minute to wake.
  return request('/sounds', { method: 'POST', body: form, headers: authHeader(), signal: AbortSignal.timeout(60_000) })
}

/** The feed, newest first. Sends the token when present so `listened` and `mine` are filled in. */
export function listSounds(): Promise<{ sounds: ApiSound[]; nextBefore: string | null }> {
  return request('/sounds?limit=200', { headers: authHeader() })
}

/** Records a listen. The first listen per user earns XP; the response carries the new total. */
export function listenSound(id: string): Promise<{ firstListen: boolean; playCount: number; xp: number; level: number }> {
  return request(`/sounds/${encodeURIComponent(id)}/listen`, { method: 'POST', headers: authHeader() })
}

export function health(): Promise<{ ok: boolean; service: string }> {
  return request<{ ok: boolean; service: string }>('/health')
}
