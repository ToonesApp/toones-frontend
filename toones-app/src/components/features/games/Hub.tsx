import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ClayCharacter } from '../../characters/ClayCharacter'
import { SPECIES } from '../../characters/clay'
import { getToken } from '../../lib/api'
import { PaperChip } from '../../ui'
import { GAMES } from './games'
import { useScores } from './scores'
import type { GameId } from './types'

export function Hub() {
  const bests = useScores((s) => s.bests)
  const [hot, setHot] = useState<GameId | null>(null)

  return (
    <main className="games-col">
      <div className="games-head">
        <h1>Games</h1>
        <p>Five rounds, fifteen seconds each. Trust your ears.</p>
      </div>
      {!getToken() && (
        <PaperChip className="games-note">
          Playing as a guest. <Link to="/auth">Sign in</Link> to save your scores.
        </PaperChip>
      )}
      <div className="games-grid">
        {GAMES.map((g) => (
          <Link
            key={g.id}
            to={g.id}
            className="game-card"
            style={{ '--tint': SPECIES[g.species].fill } as CSSProperties}
            onPointerEnter={() => setHot(g.id)}
            onPointerLeave={() => setHot(null)}
            onFocus={() => setHot(g.id)}
            onBlur={() => setHot(null)}
          >
            <ClayCharacter species={g.species} size={[160, 120]} mood={hot === g.id ? 'happy' : 'idle'} bounce={hot === g.id ? 3 : 0} idleWaves className="game-card__mascot" />
            <h2>{g.title}</h2>
            <p>{g.tagline}</p>
            <span className="game-card__foot">
              <span className="game-card__best num">
                <span className="kicker">Best</span>
                {bests?.[g.id]?.allTime ?? '–'}
              </span>
              <span className="ui-btn ui-btn--ink game-card__go">Play</span>
            </span>
          </Link>
        ))}
      </div>
      <Link to="credits" className="ui-quiet games-credits-link">
        Sound credits
      </Link>
    </main>
  )
}
