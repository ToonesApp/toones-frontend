import { useEffect, useState } from 'react'
import { getToken, me, resendVerification } from '../../../lib/api'

/** Shown in the account menu for signed-in users who haven't confirmed their email yet. */
export function VerifyEmailNotice() {
  const [verified, setVerified] = useState(true)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!getToken()) return
    let live = true
    me().then(
      (u) => live && setVerified(u.emailVerified),
      () => undefined,
    )
    return () => {
      live = false
    }
  }, [])

  if (verified) return null

  const resend = async () => {
    setStatus('sending')
    setError(null)
    try {
      const r = await resendVerification()
      if (r.emailVerified) setVerified(true)
      else setStatus('sent')
    } catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : 'Could not send the email.')
    }
  }

  return (
    <>
      <div className="hud-menu__rule" />
      <div className="hud-menu__small" role="status">
        {status === 'sent' ? 'Check your inbox for the verification link.' : 'Your email isn’t verified yet.'}
      </div>
      {error && <div className="hud-menu__small" role="alert">{error}</div>}
      {status !== 'sent' && (
        <button type="button" className="hud-menuitem" onClick={() => void resend()} disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Resend verification email'}
        </button>
      )}
    </>
  )
}
