import { useCallback, useEffect, useState } from 'react'
import { getFriends, getToken } from '../../lib/api'
import { useFeed } from '../feed/feedStore'
import type { FriendsTab } from './FriendsPanel'
import { FriendsSheet } from './FriendsSheet'
import './friends.css'

type Counts = { following: number; followers: number }

/** Posts, following and followers for the signed-in user. The last two open your friends in a sheet. */
export function ProfileStats() {
  const posts = useFeed((s) => s.toones.filter((t) => t.mine).length)
  const [counts, setCounts] = useState<Counts | null>(null)
  const [sheet, setSheet] = useState({ open: false, tab: 'following' as FriendsTab })

  const load = useCallback(() => {
    if (!getToken()) return () => undefined
    let stale = false
    getFriends().then(
      (l) => !stale && setCounts({ following: l.following.length, followers: l.followers.length }),
      () => undefined,
    )
    return () => {
      stale = true
    }
  }, [])

  // On mount, and again after the sheet closes since adding or removing someone changes the numbers
  useEffect(() => (sheet.open ? undefined : load()), [sheet.open, load])

  const show = (n: number | undefined) => (n === undefined ? '–' : n)

  return (
    <>
      <div className="pstats">
        <div className="pstats__cell">
          <span className="pstats__n num">{posts}</span>
          <span className="pstats__label">{posts === 1 ? 'Post' : 'Posts'}</span>
        </div>
        <button type="button" className="pstats__cell is-link ui-press" aria-haspopup="dialog" onClick={() => setSheet({ open: true, tab: 'following' })}>
          <span className="pstats__n num">{show(counts?.following)}</span>
          <span className="pstats__label">Following</span>
        </button>
        <button type="button" className="pstats__cell is-link ui-press" aria-haspopup="dialog" onClick={() => setSheet({ open: true, tab: 'followers' })}>
          <span className="pstats__n num">{show(counts?.followers)}</span>
          <span className="pstats__label">{counts?.followers === 1 ? 'Follower' : 'Followers'}</span>
        </button>
      </div>
      <FriendsSheet open={sheet.open} tab={sheet.tab} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </>
  )
}
