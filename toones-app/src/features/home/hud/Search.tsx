import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { PaperChip, SearchIcon } from '../../../components/ui'
import { searchPlaces, type SearchResult } from '../../../lib/geo'
import { useHome } from '../homeStore'
import { usePopover } from '../usePopover'

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)

export function Search() {
  const goTo = useHome((s) => s.goTo)
  const [query, setQuery] = useState('')
  const [hi, setHi] = useState(0)
  const { open, setOpen, ref } = usePopover<HTMLDivElement>()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const results = useMemo(() => (query.trim() ? searchPlaces(query) : []), [query])
  const showList = open && query.trim().length > 0

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === '/' && !isTyping(e.target)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const choose = (r: SearchResult) => {
    goTo(r)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!results.length) return
      setOpen(true)
      setHi((h) => (h + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length)
    } else if (e.key === 'Enter') {
      const r = results[hi]
      if (r) choose(r)
    } else if (e.key === 'Escape') {
      setQuery('')
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={ref} className="hud-search">
      <PaperChip as="label" className="hud-search__box">
        <SearchIcon className="hud-search__icon" />
        <span className="sr-only">Search a place</span>
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          placeholder="Search a city or country"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && results[hi] ? `${listId}-${hi}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHi(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <kbd className="hud-search__kbd">/</kbd>
      </PaperChip>
      {showList && (
        <PaperChip id={listId} role="listbox" radius="well" className="hud-search__results">
          {results.length ? (
            results.map((r, i) => (
              <button
                key={`${r.kind}-${r.name}`}
                id={`${listId}-${i}`}
                type="button"
                role="option"
                aria-selected={i === hi}
                className={i === hi ? 'hud-res is-hi' : 'hud-res'}
                onPointerEnter={() => setHi(i)}
                onClick={() => choose(r)}
              >
                <span className="ell">{r.name}</span>
                <span className="hud-res__sub">{r.sub}</span>
              </button>
            ))
          ) : (
            <div className="hud-res hud-res--empty">No place by that name.</div>
          )}
        </PaperChip>
      )}
    </div>
  )
}
