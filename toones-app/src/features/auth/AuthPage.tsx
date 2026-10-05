import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { prefersReducedMotion } from '../../components/characters/clay'
import { ClayButton, EyeIcon, EyeOffIcon, NightToggle, PaperChip, SegmentedTabs } from '../../components/ui'
import { KEYS, write, writeJSON } from '../../lib/storage'
import { AuthScene } from './AuthScene'
import type { AuthMode, AuthSceneEngine } from './sceneEngine'
import { validate, type AuthField, type AuthValues } from './validate'
import './auth.css'

const COPY = {
  in: {
    kicker: 'Welcome back',
    title: 'Pick up where you left off.',
    lede: 'Your drops, your friends, your footprints are waiting.',
    cta: 'Sign in',
    swapText: 'New to TOONES?',
    swapLink: 'Create an account',
  },
  up: {
    kicker: 'New here',
    title: 'Leave your first Toone.',
    lede: 'One account. Your voice, pinned wherever you go.',
    cta: 'Create account',
    swapText: 'Already have an account?',
    swapLink: 'Sign in',
  },
} as const

const TABS = [
  { value: 'in', label: 'Sign in', controls: 'auth-form' },
  { value: 'up', label: 'Sign up', controls: 'auth-form' },
] as const

export default function AuthPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<AuthMode>(() => (params.get('mode') === 'signup' || window.location.hash === '#signup' ? 'up' : 'in'))
  const [values, setValues] = useState<AuthValues>({ name: '', email: '', password: '' })
  const [show, setShow] = useState(false)
  const [touched, setTouched] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const engine = useRef<AuthSceneEngine | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const fieldRefs = useRef<Record<AuthField, HTMLInputElement | null>>({ name: null, email: null, password: null })
  const modeReady = useRef(false)

  const copy = COPY[mode]
  const up = mode === 'up'
  const error = touched ? validate(mode, values) : null
  const typed = values.name.length + values.email.length

  useEffect(() => {
    engine.current?.setMode(mode, modeReady.current)
    modeReady.current = true
  }, [mode])

  useEffect(() => {
    engine.current?.setTypedLength(typed)
  }, [typed])

  useEffect(() => {
    engine.current?.setShowPassword(show)
  }, [show])

  const changeMode = (next: AuthMode) => {
    if (next === mode) return
    setMode(next)
    setTouched(false)
  }

  const onChange = (field: AuthField) => (e: ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    engine.current?.keystroke()
  }

  const finish = (user: { name: string; email: string }) => {
    if (leaving) return
    writeJSON(KEYS.user, user)
    write(KEYS.arrive, '1')
    const go = () => navigate('/home')
    if (!engine.current || prefersReducedMotion()) return go()
    void import('../home/HomePage')
    ;(document.activeElement as HTMLElement | null)?.blur()
    window.scrollTo(0, 0)
    engine.current.leave(go)
    setLeaving(true)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    const problem = validate(mode, values)
    if (problem) {
      engine.current?.error()
      fieldRefs.current[problem.field]?.focus()
      return
    }
    finish({ name: values.name.trim(), email: values.email.trim() })
  }

  const invalid = (field: AuthField) => error?.field === field
  const onFieldFocus = () => engine.current?.setFocus('field')
  const onPasswordFocus = () => engine.current?.setFocus('pw')
  const onBlur = () => engine.current?.setFocus('')

  return (
    <div className={leaving ? 'auth is-leaving' : 'auth'} inert={leaving}>
      <header className="auth-header">
        <PaperChip as={Link} to="/auth" className="auth-wordmark">TOONES</PaperChip>
        <SegmentedTabs aria-label="Sign in or sign up" className="auth-tabs" value={mode} onChange={changeMode} options={TABS} />
        <Link to="/home" className="ui-quiet auth-back">Back to globe</Link>
      </header>

      <AuthScene engineRef={engine} formRef={formRef} />

      <main className="auth-main">
        <div className="auth-stack">
          <PaperChip as="form" id="auth-form" radius="card" className="auth-card" ref={formRef} onSubmit={onSubmit} noValidate>
            <div className="auth-intro">
              <div className="kicker">{copy.kicker}</div>
              <h1>{copy.title}</h1>
              <p>{copy.lede}</p>
            </div>

            <div className="auth-name" data-open={up} aria-hidden={!up}>
              <label className="ui-field">
                Name
                <input
                  ref={(el) => { fieldRefs.current.name = el }}
                  className="ui-input"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={48}
                  placeholder="What friends call you"
                  tabIndex={up ? 0 : -1}
                  value={values.name}
                  onChange={onChange('name')}
                  aria-invalid={invalid('name')}
                  aria-describedby={invalid('name') ? 'auth-error' : undefined}
                  onFocus={onFieldFocus}
                  onBlur={onBlur}
                />
              </label>
            </div>

            <label className="ui-field">
              Email
              <input
                ref={(el) => { fieldRefs.current.email = el }}
                className="ui-input"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@somewhere.com"
                value={values.email}
                onChange={onChange('email')}
                aria-invalid={invalid('email')}
                aria-describedby={invalid('email') ? 'auth-error' : undefined}
                onFocus={onFieldFocus}
                onBlur={onBlur}
              />
            </label>

            <div className="ui-field">
              <label htmlFor="auth-pw">Password</label>
              <div className="auth-pw">
                <input
                  ref={(el) => { fieldRefs.current.password = el }}
                  id="auth-pw"
                  className="ui-input"
                  name="password"
                  type={show ? 'text' : 'password'}
                  autoComplete={up ? 'new-password' : 'current-password'}
                  placeholder={up ? 'Choose a password' : 'Your password'}
                  value={values.password}
                  onChange={onChange('password')}
                  aria-invalid={invalid('password')}
                  aria-describedby={invalid('password') ? 'auth-error' : undefined}
                  onFocus={onPasswordFocus}
                  onBlur={onBlur}
                />
                <button type="button" className="auth-eye" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((v) => !v)}>
                  {show ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
              {!up && <a href="#forgot" className="auth-forgot">Forgot it?</a>}
            </div>

            {error && (
              <div id="auth-error" role="alert" className="auth-error">
                {error.message}
              </div>
            )}

            <ClayButton type="submit">{copy.cta}</ClayButton>

            <div className="auth-or">or</div>

            <div className="auth-social">
              <ClayButton variant="ghost" onClick={() => finish({ name: '', email: '' })}>Continue with Apple</ClayButton>
              <ClayButton variant="ghost" onClick={() => finish({ name: '', email: '' })}>Continue with Google</ClayButton>
            </div>

            {up && (
              <p className="auth-terms">
                By signing up you agree to the <a href="#terms">Terms</a> and <a href="#privacy">Privacy</a>.
              </p>
            )}
          </PaperChip>

          <p className="auth-swap">
            {copy.swapText}{' '}
            <button type="button" onClick={() => changeMode(up ? 'in' : 'up')}>{copy.swapLink}</button>
          </p>
        </div>
      </main>

      <NightToggle className="auth-night" />
    </div>
  )
}
