import type { AuthMode } from './sceneEngine'

export type AuthField = 'name' | 'email' | 'password'
export type AuthError = { field: AuthField; message: string }
export type AuthValues = { name: string; email: string; password: string }

/** Prototype stand-in until real auth exists: any valid email plus this password signs in. */
const PROTOTYPE_PASSWORD = 'a@a.a'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** First problem with the form, or null. Order matches the fields on screen. */
export function validate(mode: AuthMode, { name, email, password }: AuthValues): AuthError | null {
  if (mode === 'up' && !name.trim()) return { field: 'name', message: 'Add a name so friends recognise your Toones.' }
  if (!EMAIL.test(email)) return { field: 'email', message: 'That email does not look right.' }
  if (password !== PROTOTYPE_PASSWORD) return { field: 'password', message: 'Wrong password.' }
  return null
}
