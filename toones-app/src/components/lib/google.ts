/** Google OAuth client ID. Google sign-in is hidden entirely when this is unset. */
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

type CredentialResponse = { credential?: string }

type GoogleIdentity = {
  initialize(config: { client_id: string; callback: (response: CredentialResponse) => void }): void
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } }
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

let loading: Promise<GoogleIdentity> | null = null

/** Loads Google Identity Services once; a failed load can be retried. */
export function loadGoogle(): Promise<GoogleIdentity> {
  if (window.google) return Promise.resolve(window.google.accounts.id)
  if (loading) return loading

  loading = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => {
      if (window.google) resolve(window.google.accounts.id)
      else reject(new Error('Google sign-in failed to initialise.'))
    }
    script.onerror = () => reject(new Error('Could not load Google sign-in.'))
    document.head.appendChild(script)
  }).catch((err: unknown) => {
    loading = null
    throw err
  })

  return loading
}
