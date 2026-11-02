import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClayButton, EyeIcon, EyeOffIcon, NightToggle, PaperChip } from '../../ui'
import { ApiError, forgotPassword, resetPassword } from '../../lib/api'
import './auth.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Matches the backend: 8+ characters, and at most 72 bytes (bcrypt ignores the rest). */
const MIN_PASSWORD = 8
const MAX_PASSWORD_BYTES = 72
/** Courtesy delay before offering another email; the server enforces its own limits too. */
const RESEND_SECONDS = 60

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="auth auth-recover">
      <header className="auth-header">
        <PaperChip as={Link} to="/auth" className="auth-wordmark">TOONES</PaperChip>
        <Link to="/auth" className="ui-quiet auth-back">Back to sign in</Link>
      </header>
      <main className="auth-main">
        <div className="auth-stack">{children}</div>
      </main>
      <NightToggle className="auth-night" />
    </div>
  )
}

/** Step 1: ask for the email. The confirmation never says whether the address has an account. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(id)
  }, [wait])

  const send = async (address: string) => {
    setPending(true)
    setError(null)
    try {
      await forgotPassword(address)
      setSentTo(address)
      setWait(RESEND_SECONDS)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setPending(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (pending) return
    const address = email.trim()
    if (!EMAIL.test(address)) return setError('That email does not look right.')
    void send(address)
  }

  if (sentTo) {
    return (
      <Shell>
        <PaperChip radius="card" className="auth-card">
          <div className="auth-intro">
            <div className="kicker">Check your inbox</div>
            <h1>Reset link on its way.</h1>
          </div>
          <p className="auth-ok">
            If an account exists for <b>{sentTo}</b>, we just emailed a link to choose a new password. It works once and expires in an hour.
          </p>
          <p className="auth-hint">Nothing there? Check spam, or send it again.</p>
          {error && <div role="alert" className="auth-error">{error}</div>}
          <ClayButton variant="ghost" disabled={pending || wait > 0} onClick={() => void send(sentTo)}>
            {wait > 0 ? `Send again in ${wait}s` : 'Send again'}
          </ClayButton>
        </PaperChip>
        <p className="auth-swap"><Link to="/auth">Back to sign in</Link></p>
      </Shell>
    )
  }

  return (
    <Shell>
      <PaperChip as="form" radius="card" className="auth-card" onSubmit={onSubmit} noValidate>
        <div className="auth-intro">
          <div className="kicker">Forgot your password?</div>
          <h1>Let's get you back in.</h1>
          <p>Enter your email and we'll send you a link to choose a new password.</p>
        </div>
        <label className="ui-field">
          Email
          <input
            className="ui-input"
            type="email"
            name="email"
            autoComplete="email"
            autoFocus
            placeholder="you@somewhere.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null) }}
            aria-invalid={!!error}
            aria-describedby={error ? 'recover-error' : undefined}
          />
        </label>
        {error && <div id="recover-error" role="alert" className="auth-error">{error}</div>}
        <ClayButton type="submit" disabled={pending} aria-busy={pending}>
          {pending ? 'Sending…' : 'Send reset link'}
        </ClayButton>
      </PaperChip>
      <p className="auth-swap">Remembered it? <Link to="/auth">Sign in</Link></p>
    </Shell>
  )
}

/** Step 2: the emailed link lands here with `?token=`. */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  // Read the token once, then remove it from the address bar so it doesn't linger in history or get shared by accident.
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(!token)
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (token) window.history.replaceState(null, '', window.location.pathname)
  }, [token])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending) return
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`)
    if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) return setError(`Use at most ${MAX_PASSWORD_BYTES} characters.`)
    if (password !== confirm) return setError('Those passwords do not match.')

    setPending(true)
    setError(null)
    try {
      await resetPassword({ token, password })
      setDone(true)
    } catch (err) {
      // A 400 from the server means the link is used up or expired; anything else is worth retrying.
      if (err instanceof ApiError && err.status === 400 && /link/i.test(err.message)) setExpired(true)
      else setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <Shell>
        <PaperChip radius="card" className="auth-card">
          <div className="auth-intro">
            <div className="kicker">All set</div>
            <h1>Password updated.</h1>
            <p>Sign in with your new password. We've emailed you a note so you know it changed.</p>
          </div>
          <ClayButton onClick={() => navigate('/auth')}>Go to sign in</ClayButton>
        </PaperChip>
      </Shell>
    )
  }

  if (expired) {
    return (
      <Shell>
        <PaperChip radius="card" className="auth-card">
          <div className="auth-intro">
            <div className="kicker">Link expired</div>
            <h1>That link won't work.</h1>
            <p>Reset links work once and expire after an hour. Request a fresh one and you'll be back in a minute.</p>
          </div>
          <ClayButton onClick={() => navigate('/forgot-password')}>Request a new link</ClayButton>
        </PaperChip>
      </Shell>
    )
  }

  return (
    <Shell>
      <PaperChip as="form" radius="card" className="auth-card" onSubmit={onSubmit} noValidate>
        <div className="auth-intro">
          <div className="kicker">New password</div>
          <h1>Choose a new password.</h1>
          <p>Pick something you haven't used elsewhere.</p>
        </div>

        <div className="ui-field">
          <label htmlFor="reset-pw">New password</label>
          <div className="auth-pw">
            <input
              id="reset-pw"
              className="ui-input"
              name="password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              placeholder={`At least ${MIN_PASSWORD} characters`}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              aria-invalid={!!error}
              aria-describedby={error ? 'recover-error' : undefined}
            />
            <button type="button" className="auth-eye" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((v) => !v)}>
              {show ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </div>
        </div>

        <label className="ui-field">
          Confirm password
          <input
            className="ui-input"
            name="confirm"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(null) }}
          />
        </label>

        {error && <div id="recover-error" role="alert" className="auth-error">{error}</div>}

        <ClayButton type="submit" disabled={pending} aria-busy={pending}>
          {pending ? 'Updating…' : 'Update password'}
        </ClayButton>
      </PaperChip>
    </Shell>
  )
}
