import { useCallback, useEffect, useState } from 'react'
import { KEYS, read, write } from '../../lib/storage'

const clips = new Map<string, HTMLAudioElement>()

/** Starts fetching a clip. Called for the next round while the current one plays. */
export function preload(src: string | undefined) {
  if (!src) return null
  let a = clips.get(src)
  if (!a) {
    a = new Audio()
    a.preload = 'auto'
    a.src = src
    clips.set(src, a)
  }
  return a
}

export function useMuted() {
  const [muted, setMuted] = useState(() => read(KEYS.gamesMuted) === '1')
  const toggle = useCallback(() => {
    setMuted((m) => {
      write(KEYS.gamesMuted, m ? '0' : '1')
      return !m
    })
  }, [])
  return [muted, toggle] as const
}

/** Plays a round's clip once when the round starts. `failed` means the caption has to stand in. */
export function useClip(src: string | undefined, muted: boolean) {
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const a = preload(src)
    if (!a) return
    const on = () => setPlaying(true)
    const off = () => setPlaying(false)
    const bad = () => setFailed(true)
    a.addEventListener('play', on)
    a.addEventListener('pause', off)
    a.addEventListener('ended', off)
    a.addEventListener('error', bad)
    if (a.error) bad()
    a.currentTime = 0
    a.play().catch(() => undefined)
    return () => {
      a.pause()
      a.removeEventListener('play', on)
      a.removeEventListener('pause', off)
      a.removeEventListener('ended', off)
      a.removeEventListener('error', bad)
    }
  }, [src])

  useEffect(() => {
    const a = preload(src)
    if (a) a.muted = muted
  }, [src, muted])

  const replay = useCallback(() => {
    const a = preload(src)
    if (!a) return
    a.currentTime = 0
    a.play().catch(() => undefined)
  }, [src])

  return { playing, failed, replay }
}
