import { useEffect, useRef, type RefObject } from 'react'
import { useNight } from '../../lib/storage'
import { AuthSceneEngine } from './sceneEngine'

type AuthSceneProps = {
  /** Filled with the running engine so the form can drive reactions. */
  engineRef: RefObject<AuthSceneEngine | null>
  formRef: RefObject<HTMLElement | null>
}

export function AuthScene({ engineRef, formRef }: AuthSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [night] = useNight()
  const initialNight = useRef(night)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new AuthSceneEngine(canvas, () => formRef.current?.getBoundingClientRect() ?? null)
    engine.setNight(initialNight.current, true)
    engine.start()
    engineRef.current = engine
    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [engineRef, formRef])

  useEffect(() => {
    engineRef.current?.setNight(night)
  }, [engineRef, night])

  return (
    <section className="auth-scene" aria-hidden="true">
      <canvas ref={canvasRef} />
    </section>
  )
}
