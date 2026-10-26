import { useCallback, useEffect, useState } from 'react'
import { LookAvatar } from '../../characters/LookAvatar'
import { sanitizeLook } from '../../characters/avatar'
import { addFriend, getFriends, getToken, removeFriend, searchPeople, type ApiPerson } from '../../lib/api'
import { PaperChip } from '../../ui'
import { useFeed } from '../feed/feedStore'
import { PublicProfileSheet } from '../profile/PublicProfileSheet'
import './friends.css'

export type FriendsTab = 'following' | 'followers'

const SEARCH_DELAY_MS = 300
const MIN_QUERY = 2

/** Search people by username, add or remove them, and browse who you follow and who follows you. */
export function FriendsPanel({ initialTab = 'following' }: { initialTab?: FriendsTab }) {
  const signedIn = !!getToken()
  const [tab, setTab] = useState<FriendsTab>(initialTab)
  const [lists, setLists] = useState<Record<FriendsTab, ApiPerson[]>>({ following: [], followers: [] })
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ApiPerson[] | null>(null)
  const [busy, setBusy] = useState<string[]>([])
  const [view, setView] = useState({ open: false, username: '' })
  const q = query.trim().replace(/^@/, '')

  const refresh = useCallback(
    () =>
      getFriends().then(
        (l) => {
          setLists(l)
          setLoaded(true)
        },
        () => {
          useFeed.getState().flash('Could not load friends')
          setLoaded(true)
        },
      ),
    [],
  )

  useEffect(() => {
    if (signedIn) void refresh()
  }, [signedIn, refresh])

  const searching = signedIn && q.length >= MIN_QUERY

  useEffect(() => {
    if (!searching) return
    let stale = false
    const timer = window.setTimeout(() => {
      searchPeople(q).then(
        (people) => !stale && setResults(people),
        () => !stale && setResults([]),
      )
    }, SEARCH_DELAY_MS)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [q, searching])

  const toggle = async (p: ApiPerson) => {
    if (busy.includes(p.id)) return
    setBusy((b) => [...b, p.id])
    try {
      if (p.following) await removeFriend(p.username)
      else await addFriend(p.username)
      const following = !p.following
      setResults((r) => r && r.map((x) => (x.id === p.id ? { ...x, following } : x)))
      await refresh()
      useFeed.getState().flash(following ? `Added @${p.username}` : `Removed @${p.username}`)
    } catch (e) {
      useFeed.getState().flash(e instanceof Error ? e.message : 'Something went wrong')
    }
    setBusy((b) => b.filter((id) => id !== p.id))
  }

  if (!signedIn) return <p className="view-note">Sign in to find friends and see their characters.</p>

  const list = lists[tab]

  return (
    <>
      <input
        className="pill-input friends__search"
        type="search"
        inputMode="search"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="Search by username"
        aria-label="Search people by username"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {searching && results ? (
        <>
          <div className="kicker friends__kicker">Results</div>
          {!results.length && <p className="view-note">No one found for “{q}”.</p>}
          {results.map((p) => (
            <Person key={p.id} p={p} busy={busy.includes(p.id)} onToggle={toggle} onOpen={(u) => setView({ open: true, username: u })} />
          ))}
        </>
      ) : (
        <>
          <div className="chips" role="tablist" aria-label="Friends">
            {(['following', 'followers'] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} className="chip ui-press friends__tab" onClick={() => setTab(t)}>
                {t === 'following' ? 'Following' : 'Followers'} · {lists[t].length}
              </button>
            ))}
          </div>
          {loaded && !list.length && (
            <p className="view-note">{tab === 'following' ? 'You haven’t added anyone yet. Search a username above.' : 'No one follows you yet.'}</p>
          )}
          {list.map((p) => (
            <Person key={p.id} p={p} busy={busy.includes(p.id)} onToggle={toggle} onOpen={(u) => setView({ open: true, username: u })} />
          ))}
        </>
      )}
      <PublicProfileSheet open={view.open} username={view.username} onChanged={() => void refresh()} onClose={() => setView((v) => ({ ...v, open: false }))} />
    </>
  )
}

function Person({ p, busy, onToggle, onOpen }: { p: ApiPerson; busy: boolean; onToggle: (p: ApiPerson) => void; onOpen: (username: string) => void }) {
  const note = p.following && p.followsYou ? 'Friends' : p.followsYou ? 'Follows you' : ''
  return (
    <PaperChip radius="well" className="friend">
      <button type="button" className="friend__open ui-press" aria-haspopup="dialog" aria-label={`View @${p.username}'s profile`} onClick={() => onOpen(p.username)}>
        <LookAvatar look={sanitizeLook(p.look)} size={52} />
        <span className="friend__who">
          <span className="friend__name ell">{p.displayName}</span>
          <span className="friend__sub ell num">
            @{p.username} · Lv {p.level}
            {note && ` · ${note}`}
          </span>
        </span>
      </button>
      <button type="button" className={p.following ? 'pill-btn friend__btn ui-press' : 'pill-btn friend__btn is-add ui-press'} disabled={busy} onClick={() => onToggle(p)}>
        {p.following ? 'Remove' : p.followsYou ? 'Follow back' : 'Add'}
      </button>
    </PaperChip>
  )
}
