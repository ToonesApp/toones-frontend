import type { CSSProperties } from 'react'
import type { Look } from './avatar'
import { lookDataUrl } from './avatarImage'

/** A user's character as a round, static portrait. */
export function LookAvatar({ look, size = 56, className, style }: { look: Look; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <img
      src={lookDataUrl(look, size > 64 ? 240 : 120)}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={['look-avatar', className].filter(Boolean).join(' ')}
      style={style}
    />
  )
}
