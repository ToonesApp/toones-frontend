import type { ComponentProps } from 'react'
import './ui.css'

type ClayButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'ink' | 'ghost'
  block?: boolean
}

export function ClayButton({ variant = 'primary', block, className, type = 'button', ...rest }: ClayButtonProps) {
  const cls = ['ui-btn', 'ui-press', `ui-btn--${variant}`, block && 'ui-btn--block', className].filter(Boolean).join(' ')
  return <button type={type} className={cls} {...rest} />
}
