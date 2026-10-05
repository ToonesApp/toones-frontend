import type { ComponentProps, ElementType } from 'react'
import './ui.css'

export type ChipRadius = 'pill' | 'card' | 'dialog' | 'well' | 'rail' | 'icon'

type PaperChipProps<T extends ElementType> = {
  as?: T
  radius?: ChipRadius
} & Omit<ComponentProps<T>, 'as'>

export function PaperChip<T extends ElementType = 'div'>({ as, radius = 'pill', className, ...rest }: PaperChipProps<T>) {
  const Tag: ElementType = as ?? 'div'
  return <Tag className={['ui-chip', `ui-r-${radius}`, className].filter(Boolean).join(' ')} {...rest} />
}
