import { KEYS, read, write } from './storage'

/** Override per-environment; the default matches the backend's own PORT default. */
const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '')

export type ApiUser = {
  id: string
  email: string
  username: string
  displayName: string
  createdAt: string
}

export type AuthResult = { token: string; user: ApiUser }

/** Mirrors POST /auth/register. Username is `[a-z0-9_]{3,24}`, password is 8+ chars. */
export type RegisterInput = {
  email: string
  username: string
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
      headers: { 'Content-Type': 'application/json', ...init?.headers },
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

export function health(): Promise<{ ok: boolean; service: string }> {
  return request<{ ok: boolean; service: string }>('/health')
}
