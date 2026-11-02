import { useEffect, useState } from 'react'
import { ApiError, MAX_BIO_LENGTH, getToken, me, saveBio, type ApiUser } from '../../lib/api'
import { ClayButton } from '../../ui'
import { useFeed } from '../feed/feedStore'
import './profile.css'

const joined = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

/** Your bio and join date, with inline editing. Only shown while signed in with the server. */
export function BioCard() {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!getToken()) return
    let stale = false
    me().then(
      (u) => !stale && setUser(u),
      () => undefined,
    )
    return () => {
      stale = true
    }
  }, [])

  if (!user) return null

  const save = async () => {
    if (draft === null || saving) return
    setSaving(true)
    try {
      setUser(await saveBio(draft))
      setDraft(null)
      useFeed.getState().flash('Bio saved')
    } catch (e) {
      useFeed.getState().flash(e instanceof ApiError ? e.message : 'Could not save your bio')
    }
    setSaving(false)
  }

  return (
    <div className="bio">
      {draft === null ? (
        <>
          <p className={user.bio ? 'bio__text' : 'bio__text is-empty'}>{user.bio || 'Add a short bio so friends know who you are.'}</p>
          <div className="bio__row">
            <span className="bio__joined num">Joined {joined(user.createdAt)}</span>
            <button type="button" className="pill-btn ui-press" onClick={() => setDraft(user.bio)}>
              {user.bio ? 'Edit bio' : 'Add bio'}
            </button>
          </div>
        </>
      ) : (
        <>
          <textarea
            className="bio__input"
            rows={3}
            maxLength={MAX_BIO_LENGTH}
            autoFocus
            placeholder="Recording rain in Kathmandu"
            aria-label="Your bio"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="bio__row">
            <span className="bio__joined num">
              {draft.length} / {MAX_BIO_LENGTH}
            </span>
            <span className="bio__actions">
              <ClayButton variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </ClayButton>
              <ClayButton variant="primary" onClick={save} disabled={saving || draft.trim() === user.bio}>
                Save
              </ClayButton>
            </span>
          </div>
        </>
      )}
    </div>
  )
}
