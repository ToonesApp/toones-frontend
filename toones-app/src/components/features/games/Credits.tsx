import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BackIcon, PaperChip } from '../../ui'
import { GAMES } from './games'
import { CreditLine } from './Round'
import type { GameId, GameItem } from './types'

/** Every clip and picture used by the games, read from the same data files the rounds use. */
export default function Credits() {
  const [data, setData] = useState<Partial<Record<GameId, GameItem[]>>>({})

  useEffect(() => {
    let alive = true
    for (const g of GAMES) {
      g.load().then(
        (items) => alive && setData((d) => ({ ...d, [g.id]: items })),
        () => undefined,
      )
    }
    return () => {
      alive = false
    }
  }, [])

  return (
    <main className="games-col games-col--narrow">
      <Link to="/games" className="ui-quiet games-back">
        <BackIcon /> All games
      </Link>
      <div className="games-head">
        <h1>Credits</h1>
        <p>Every sound and picture in the games is openly licensed. Clips were trimmed to a few seconds and levelled in volume; pictures were cropped and resized.</p>
      </div>
      {GAMES.map((g) => (
        <PaperChip key={g.id} as="section" radius="card" className="credits">
          <h2>{g.title}</h2>
          <ul>
            {(data[g.id] ?? []).map((item) => (
              <li key={item.id}>
                <span className="credits__name">{item.answer}</span>
                <CreditLine what={item.audio ? 'Sound' : 'Text'} credit={item.credit} />
                {item.reveal.imageCredit && <CreditLine what="Image" credit={item.reveal.imageCredit} />}
              </li>
            ))}
          </ul>
        </PaperChip>
      ))}
    </main>
  )
}
