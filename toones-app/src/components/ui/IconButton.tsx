import type { ButtonHTMLAttributes } from 'react'
import './ui.css'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  'aria-label': string
  /** ink: filled squircle (play/pause). quiet: transparent, used in control columns. */
  variant?: 'ink' | 'quiet'
  size?: 'md' | 'sm'
}

export function IconButton({ variant = 'ink', size = 'md', className, type = 'button', ...rest }: IconButtonProps) {
  const cls = ['ui-icon-btn', 'ui-press', `ui-icon-btn--${variant}`, `ui-icon-btn--${size}`, className].filter(Boolean).join(' ')
  return <button type={type} className={cls} {...rest} />
}
