import { useRef, type KeyboardEvent } from 'react'
import { PaperChip } from './PaperChip'
import './ui.css'

export type TabOption<T extends string> = { value: T; label: string; title?: string; controls?: string }

type SegmentedTabsProps<T extends string> = {
  options: readonly TabOption<T>[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  /** paper: floating pill on the sky. well: inset inside a card. */
  surface?: 'paper' | 'well'
  className?: string
}

export function SegmentedTabs<T extends string>({ options, value, onChange, surface = 'paper', className, ...aria }: SegmentedTabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const i = options.findIndex((o) => o.value === value)
    const next = (i + step + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  const tabs = options.map((o, i) => {
    const selected = o.value === value
    return (
      <button
        key={o.value}
        ref={(el) => { refs.current[i] = el }}
        type="button"
        role="tab"
        className="ui-seg__tab"
        aria-selected={selected}
        aria-controls={o.controls}
        tabIndex={selected ? 0 : -1}
        title={o.title}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    )
  })

  const cls = ['ui-seg', className].filter(Boolean).join(' ')

  return surface === 'paper' ? (
    <PaperChip role="tablist" aria-label={aria['aria-label']} className={cls} onKeyDown={onKeyDown}>
      {tabs}
    </PaperChip>
  ) : (
    <div role="tablist" aria-label={aria['aria-label']} className={`${cls} ui-seg--well`} onKeyDown={onKeyDown}>
      {tabs}
    </div>
  )
}
