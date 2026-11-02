import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AUDIO_SET_LABELS, canonicalAudioSetLabel, type AudioSetLabel } from '../lib/audioSetLabels'

const MAX_RESULTS = 8

type CategoryPickerProps = {
  value: AudioSetLabel | ''
  onChange: (label: AudioSetLabel) => void
  disabled?: boolean
  /** Optional class on the outer field. */
  className?: string
}

/** Compact typeahead over the 521 AudioSet labels. */
export function CategoryPicker({ value, onChange, disabled, className }: CategoryPickerProps) {
  const listId = useId()
  const [query, setQuery] = useState<string>(value)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return AUDIO_SET_LABELS.slice(0, MAX_RESULTS) as AudioSetLabel[]
    const out: AudioSetLabel[] = []
    for (const label of AUDIO_SET_LABELS) {
      if (label.toLowerCase().includes(q)) {
        out.push(label)
        if (out.length >= MAX_RESULTS) break
      }
    }
    return out
  }, [query])

  const pick = (label: AudioSetLabel) => {
    onChange(label)
    setQuery(label)
    setOpen(false)
  }

  const commitTyped = () => {
    const hit = canonicalAudioSetLabel(query)
    if (hit) pick(hit)
    else setQuery(value)
    setOpen(false)
  }

  return (
    <div ref={wrap} className={['cat-pick', className].filter(Boolean).join(' ')}>
      <input
        className="ui-input cat-pick__input"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        disabled={disabled}
        placeholder="Search a sound label"
        value={open ? query : value}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => {
          setQuery(value)
          setOpen(true)
          setActive(0)
        }}
        onBlur={commitTyped}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((i) => Math.min(results.length - 1, i + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(0, i - 1))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const hit = results[active]
            if (hit) pick(hit)
            else commitTyped()
          } else if (e.key === 'Escape') {
            setQuery(value)
            setOpen(false)
          }
        }}
      />
      {open && results.length > 0 && (
        <ul id={listId} className="cat-pick__list" role="listbox">
          {results.map((label, i) => (
            <li key={label} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={i === active ? 'cat-pick__opt is-active' : 'cat-pick__opt'}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(label)}
                onMouseEnter={() => setActive(i)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
