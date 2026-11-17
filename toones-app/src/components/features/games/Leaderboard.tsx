import { useEffect, useState } from 'react'
import { DEFAULT_LOOK } from '../../characters/avatar'
import { LookAvatar } from '../../characters/LookAvatar'
import { getLeaderboard, type LeaderboardEntry, type LeaderboardScope } from '../../lib/api'
import { PaperChip, SegmentedTabs } from '../../ui'
import type { GameId } from './types'

const SCOPES: readonly { value: LeaderboardScope; label: string }[] = [
  { value: 'daily', label: 'Today' },
  { value: 'all', label: 'All time' },
]

type Board = { key: string; entries: LeaderboardEntry[] | null }

/** Top ten for a game. `version` changes when a new score is saved, which reloads the list. */
export function Leaderboard({ game, version = 0 }: { game: GameId; version?: number }) {
  const [scope, setScope] = useState<LeaderboardScope>('daily')
  const [board, setBoard] = useState<Board>({ key: '', entries: null })
  const key = `${game}:${scope}:${version}`
  const loading = board.key !== key

  useEffect(() => {
    let alive = true
    getLeaderboard(game, scope).then(
      (res) => alive && setBoard({ key, entries: res.entries }),
      () => alive && setBoard({ key, entries: null }),
    )
    return () => {
      alive = false
    }
  }, [game, scope, key])

  return (
    <PaperChip as="section" radius="card" className="board" aria-label="Leaderboard">
      <div className="board__head">
        <h2>Leaderboard</h2>
        <SegmentedTabs aria-label="Leaderboard range" surface="well" options={SCOPES} value={scope} onChange={setScope} />
      </div>
      {loading ? (
        <p className="board__note">Loading scores</p>
      ) : !board.entries ? (
        <p className="board__note">Can’t reach the leaderboard right now.</p>
      ) : !board.entries.length ? (
        <p className="board__note">{scope === 'daily' ? 'No one has finished today’s challenge yet. Be the first.' : 'No scores yet.'}</p>
      ) : (
        <ol className="board__list">
          {board.entries.map((e, n) => (
            <li key={e.username} className={e.isMe ? 'board__row is-me' : 'board__row'}>
              <span className="board__rank num">{n + 1}</span>
              <LookAvatar look={e.look ?? DEFAULT_LOOK} size={28} />
              <span className="board__name">
                {e.displayName}
                {e.isMe && <span className="sr-only"> (you)</span>}
              </span>
              <span className="board__score num">{e.score}</span>
            </li>
          ))}
        </ol>
      )}
    </PaperChip>
  )
}
