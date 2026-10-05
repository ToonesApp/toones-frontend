import type { ButtonHTMLAttributes } from 'react'
import './ui.css'

type FabProps = ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label': string }

export function Fab({ className, type = 'button', ...rest }: FabProps) {
  return <button type={type} className={['ui-fab', 'ui-press', className].filter(Boolean).join(' ')} {...rest} />
}
