import type { AuthMode } from './sceneEngine'

export type AuthField = 'name' | 'email' | 'password'
export type AuthError = { field: AuthField; message: string }
export type AuthValues = { name: string; email: string; password: string }

/** Matches the backend's minimum in POST /auth/register. */
const MIN_PASSWORD = 8

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** First problem with the form, or null. Order matches the fields on screen. */
export function validate(mode: AuthMode, { name, email, password }: AuthValues): AuthError | null {
  if (mode === 'up' && !name.trim()) return { field: 'name', message: 'Add a name so friends recognise your Toones.' }
  if (!EMAIL.test(email)) return { field: 'email', message: 'That email does not look right.' }
  if (!password) return { field: 'password', message: 'Enter your password.' }
  if (mode === 'up' && password.length < MIN_PASSWORD) return { field: 'password', message: `Use at least ${MIN_PASSWORD} characters.` }
  return null
}