import { useEffect, useState } from 'react'
import { ClayCharacter } from '../characters/ClayCharacter'
import '../../styles/preloader.css'

const PRELOADER_DURATION = 3000

export function Preloader() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), PRELOADER_DURATION)
    return () => window.clearTimeout(timer)
  }, [])

  if (ready) return null

  return (
    <div className="preloader" role="status" aria-live="polite" aria-label="Loading Toones">
      <div className="preloader__content">
        <div className="preloader__characters" aria-hidden="true">
          <ClayCharacter species="moss" size={112} mood="happy" idleWaves />
          <ClayCharacter species="pip" size={92} mood="oh" idleWaves />
          <ClayCharacter species="tomo" size={118} mood="happy" idleWaves />
        </div>
        <p className="preloader__wordmark">TOONES</p>
        <p className="preloader__message">A little world is getting ready</p>
        <div className="preloader__track" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  )
}
