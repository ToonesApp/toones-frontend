import { useEffect, useState } from 'react'

/** Keeps a panel mounted through its exit transition. `open` turns on a frame after mount so the enter transition runs. */
export function usePresence(want: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(want)
  const [entered, setEntered] = useState(false)
  if (want && !mounted) setMounted(true)

  useEffect(() => {
    if (want) {
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
      return () => cancelAnimationFrame(r)
    }
    const t = setTimeout(() => {
      setMounted(false)
      setEntered(false)
    }, exitMs)
    return () => clearTimeout(t)
  }, [want, exitMs])

  return { mounted: mounted || want, open: want && entered }
}
