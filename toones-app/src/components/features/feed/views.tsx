import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClayCharacter } from '../../characters/ClayCharacter'
import { LookAvatar } from '../../characters/LookAvatar'
import { useLook } from '../../characters/lookStore'
import { ProfileEditor } from '../profile/ProfileEditor'
import { CATEGORIES } from '../../characters/clay'
import { setNight, useNight } from '../../lib/storage'
import { levelFromXp } from '../../lib/xp'
import { ClayButton, PaperChip, SegmentedTabs } from '../../ui'
import { displayName, useHome } from '../home/homeStore'
import { stopFeed } from './feedPlayer'
import { inboxMessages, useFeed, visibleToones, type Settings, type Tab } from './feedStore'
import { ago } from '../home/format'
import { SkeletonCard, ToonCard } from './ToonCard'

const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'nearby', label: 'Nearby' },
  { value: 'new', label: 'New' },
  { value: 'saved', label: 'Saved' },
]

export function FeedView() {
  const toones = useFeed((s) => s.toones)
  const status = useFeed((s) => s.status)
  const settling = useFeed((s) => s.settling)
  const tab = useFeed((s) => s.tab)
  const cats = useFeed((s) => s.cats)
  const liked = useFeed((s) => s.liked)
  const origin = useFeed((s) => s.origin)
  const { setTab, toggleCat, allCats, load } = useFeed.getState()
  const list = visibleToones({ toones, cats, tab, liked, origin })
  const loading = status === 'idle' || (status === 'loading' && !toones.length) || settling

  return (
    <>
      <div className="feed-head">
        <h1>Feed</h1>
        <SegmentedTabs aria-label="Sort the feed" options={TABS} value={tab} onChange={setTab} />
      </div>
      <div className="chips" role="group" aria-label="Categories">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className="chip ui-press" aria-pressed={cats.includes(c)} onClick={() => toggleCat(c)}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : status === 'error' && !toones.length ? (
        <Empty title="Can’t reach Toones" body="The server may be waking up. That can take up to a minute." action="Try again" onAction={() => void load()} />
      ) : !list.length ? (
        !toones.length ? (
          <Empty title="No Toones yet" body="Be the first: record a sound where you are." action="Record a Toone" onAction={() => useFeed.getState().setSheet(true)} />
        ) : tab === 'saved' && cats.length ? (
          <Empty title="No saved Toones yet" body="Tap the heart on a Toone to keep it here." action="Browse new Toones" onAction={() => setTab('new')} />
        ) : !cats.length ? (
          <Empty title="All categories are off" body="Turn a category back on to see Toones." action="Show all categories" onAction={allCats} />
        ) : (
          <Empty title="Nothing nearby" body="No Toones match these categories right now." action="Show all categories" onAction={allCats} />
        )
      ) : (
        list.map((t) => <ToonCard key={t.id} toone={t} />)
      )}
    </>
  )
}

function Empty({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <PaperChip radius="card" className="empty">
      <ClayCharacter species="pip" size={140} mood="talk" idleWaves interactive fill={0.7} />
      <h2>{title}</h2>
      <p>{body}</p>
      <ClayButton variant="ink" onClick={onAction}>
        {action}
      </ClayButton>
    </PaperChip>
  )
}

export function InboxView() {
  const toones = useFeed((s) => s.toones)
  const read = useFeed((s) => s.read)
  const markRead = useFeed((s) => s.markRead)
  const messages = inboxMessages(toones)

  return (
    <>
      <div className="feed-head">
        <h1>Inbox</h1>
      </div>
      {!messages.length && <p className="view-note">Nothing here yet. Messages about your Toones and new drops show up here.</p>}
      {messages.map((m) => {
        const unread = !read.includes(m.id)
        return (
          <PaperChip key={m.id} as="button" type="button" radius="well" className={unread ? 'msg is-unread ui-press' : 'msg ui-press'} onClick={() => markRead(m.id)}>
            <span className="avatar avatar--52" style={{ background: `var(--cat-${m.cat.toLowerCase()})` }} aria-hidden="true">
              {m.initial}
            </span>
            <span className="msg__body">
              <span className="msg__text">{m.text}</span>
              <span className="msg__time">{ago(m.when)}</span>
            </span>
            {unread && <span className="msg__dot" aria-label="Unread" />}
          </PaperChip>
        )
      })}
    </>
  )
}

const SWITCHES: readonly { key: keyof Settings | 'night'; label: string; hint: string }[] = [
  { key: 'autoplay', label: 'Auto-play next', hint: 'Play the next Toone when one ends' },
  { key: 'react', label: 'Characters react', hint: 'The rail looks, hops and sleeps' },
  { key: 'notify', label: 'Notifications', hint: 'Likes, comments and new Toones nearby' },
  { key: 'night', label: 'Night mode', hint: 'Shared with the globe' },
]

export function SettingsView() {
  const settings = useFeed((s) => s.settings)
  const setSetting = useFeed((s) => s.setSetting)
  const user = useHome((s) => s.user)
  const xp = useHome((s) => s.xp)
  const signOut = useHome((s) => s.signOut)
  const [night] = useNight()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const look = useLook(user.email)
  const name = displayName(user)
  const handle = user.email ? `@${user.email.split('@')[0]}` : ''

  return (
    <>
      <div className="feed-head">
        <h1>Settings</h1>
      </div>
      <PaperChip radius="card" className="profile">
        <button type="button" className="profile__main" aria-haspopup="dialog" onClick={() => setEditing(true)}>
          <LookAvatar look={look} size={56} />
          <span className="profile__who">
            <span className="profile__name ell">{name}</span>
            <span className="profile__sub ell num">
              {handle && `${handle} · `}Lv {levelFromXp(xp)} · {xp} xp
            </span>
          </span>
          <span className="profile__edit">Edit character</span>
        </button>
        <button
          type="button"
          className="ui-quiet"
          onClick={() => {
            stopFeed()
            signOut()
            navigate('/auth')
          }}
        >
          Sign out
        </button>
      </PaperChip>
      <ProfileEditor open={editing} email={user.email} initial={look} onClose={() => setEditing(false)} />
      <PaperChip radius="card" className="settings">
        {SWITCHES.map((s) => {
          const on = s.key === 'night' ? night : settings[s.key]
          return (
            <label key={s.key} className="setting">
              <span>
                <span className="setting__label">{s.label}</span>
                <span className="setting__hint">{s.hint}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={on}
                onChange={(e) => (s.key === 'night' ? setNight(e.target.checked) : setSetting(s.key, e.target.checked))}
              />
            </label>
          )
        })}
      </PaperChip>
    </>
  )
}
