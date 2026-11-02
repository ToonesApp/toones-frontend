import { useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID, loadGoogle } from '../../lib/google'

type Props = {
  /** Called with Google's ID token once the user picks an account. */
  onCredential: (credential: string) => void
  disabled?: boolean
}

/** Google's own rendered button; clicking it opens Google's account chooser. */
export function GoogleSignIn({ onCredential, disabled }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(onCredential)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    latest.current = onCredential
  })

  useEffect(() => {
    let cancelled = false

    loadGoogle()
      .then((google) => {
        const el = host.current
        if (cancelled || !el) return
        google.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) latest.current(response.credential)
          },
        })
        el.replaceChildren()
        google.renderButton(el, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
          width: Math.min(400, Math.max(200, el.offsetWidth)),
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (failed) {
    return <p className="auth-google-fail">Google sign-in is unavailable right now.</p>
  }

  return <div ref={host} className="auth-google" aria-disabled={disabled} data-disabled={disabled || undefined} />
}
