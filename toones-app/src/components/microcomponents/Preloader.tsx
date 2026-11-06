import { useEffect, useState } from 'react'
import { ClayCharacter } from '../characters/ClayCharacter'
import '../../styles/preloader.css'

const MIN_DISPLAY_MS = 2000

export function Preloader() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let handleLoad: (() => void) | undefined

    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, MIN_DISPLAY_MS))
    const contentLoaded = new Promise<void>((resolve) => {
      if (document.readyState === 'complete') return resolve()
      handleLoad = () => resolve()
      window.addEventListener('load', handleLoad, { once: true })
    })

    Promise.all([minDelay, contentLoaded]).then(() => {
      if (!cancelled) setReady(true)
    })

    return () => {
      cancelled = true
      if (handleLoad) window.removeEventListener('load', handleLoad)
    }
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
