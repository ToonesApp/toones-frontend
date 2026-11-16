import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ClayCharacter } from '../../characters/ClayCharacter'
import { getToken } from '../../lib/api'
import { KEYS, readJSON, writeJSON } from '../../lib/storage'
import { BackIcon, ClayButton, PaperChip, SegmentedTabs, ShareIcon } from '../../ui'
import { preload } from './audio'
import { dailySeed, pickRounds, shareText, today, type Answer } from './engine'
import { findGame, type GameDef } from './games'
import { Rounds } from './Round'
import type { GameItem, Mode } from './types'

type Run = { key: number; daily: boolean; mode: Mode; rounds: GameItem[]; answers?: Answer[] }
type DailyLog = Record<string, { day: string; score: number }>

const MODES: readonly { value: Mode; label: string; hint: string }[] = [
  { value: 'choice', label: 'Classic', hint: 'Pick from four choices.' },
  { value: 'type', label: 'Type it', hint: 'Hard mode: no choices, type the answer.' },
  { value: 'pin', label: 'Pin it', hint: 'Hard mode: drop a pin on the globe. Closer scores more.' },
]

const total = (answers: readonly Answer[]) => answers.reduce((sum, a) => sum + a.points, 0)

export default function Play() {
  const def = findGame(useParams().game)
  return def ? <Game key={def.id} def={def} /> : <Navigate to="/games" replace />
}

function Game({ def }: { def: GameDef }) {
  const [items, setItems] = useState<GameItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [run, setRun] = useState<Run | null>(null)
  const [daily, setDaily] = useState(() => readJSON<DailyLog>(KEYS.gamesDaily, {}))
  const played = daily[def.id]?.day === today() ? daily[def.id].score : null

  useEffect(() => {
    let alive = true
    def.load().then(
      (data) => alive && setItems(data),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [def])

  const start = (isDaily: boolean, mode: Mode) => {
    if (!items) return
    const rounds = pickRounds(items, isDaily ? dailySeed(def.id) : Math.floor(Math.random() * 2 ** 32), mode === 'pin')
    preload(rounds[0]?.audio)
    setRun({ key: Date.now(), daily: isDaily, mode, rounds })
  }

  const finish = (answers: Answer[]) => {
    if (!run) return
    setRun({ ...run, answers })
    if (!run.daily) return
    const next = { ...daily, [def.id]: { day: today(), score: total(answers) } }
    writeJSON(KEYS.gamesDaily, next)
    setDaily(next)
  }

  return (
    <main className="games-col games-col--narrow">
      <Link to="/games" className="ui-quiet games-back">
        <BackIcon /> All games
      </Link>
      {!run ? (
        <Intro def={def} ready={!!items?.length} failed={failed} played={played} onStart={start} />
      ) : !run.answers ? (
        <Rounds key={run.key} def={def} mode={run.mode} rounds={run.rounds} onDone={finish} />
      ) : (
        <Results def={def} run={run} answers={run.answers} onAgain={() => start(false, run.mode)} />
      )}
    </main>
  )
}

type IntroProps = { def: GameDef; ready: boolean; failed: boolean; played: number | null; onStart: (daily: boolean, mode: Mode) => void }

function Intro({ def, ready, failed, played, onStart }: IntroProps) {
  const [mode, setMode] = useState<Mode>('choice')
  const modes = MODES.filter((m) => def.modes.includes(m.value))

  return (
    <PaperChip radius="card" className="game-intro">
      <ClayCharacter species={def.species} size={[180, 132]} idleWaves interactive />
      <h1>{def.title}</h1>
      <p>{def.tagline} Five rounds, fifteen seconds each. Fast answers and streaks score more.</p>
      {modes.length > 1 && <SegmentedTabs aria-label="How to answer" surface="well" options={modes} value={mode} onChange={setMode} />}
      {modes.length > 1 && <p className="game-intro__hint">{modes.find((m) => m.value === mode)?.hint}</p>}
      <div className="game-intro__actions">
        <ClayButton disabled={!ready || played !== null} onClick={() => onStart(true, 'choice')}>
          {played !== null ? `Daily done · ${played}` : 'Daily challenge'}
        </ClayButton>
        <ClayButton variant="ink" disabled={!ready} onClick={() => onStart(false, mode)}>
          Free play
        </ClayButton>
      </div>
      <p className="game-intro__hint">
        {failed ? 'Couldn’t load this game. Check your connection and reload.' : played !== null ? 'A new daily challenge starts at midnight UTC.' : 'The daily challenge is the same five Classic rounds for everyone.'}
      </p>
    </PaperChip>
  )
}

function Results({ def, run, answers, onAgain }: { def: GameDef; run: Run; answers: Answer[]; onAgain: () => void }) {
  const [copied, setCopied] = useState(false)
  const [cheer, setCheer] = useState(0)
  const score = total(answers)
  const right = answers.filter((a) => a.correct).length

  useEffect(() => {
    if (right * 2 < answers.length) return
    const id = window.setTimeout(() => setCheer(1), 350)
    return () => window.clearTimeout(id)
  }, [right, answers.length])

  const share = async () => {
    const text = shareText(def.title, answers, score, run.daily, `${window.location.origin}/games/${def.id}`)
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
      }
    } catch {
      // Share sheet dismissed, or the clipboard is blocked
    }
  }

  return (
    <PaperChip radius="card" className="game-intro">
      <ClayCharacter species={def.species} size={[180, 132]} mood={cheer ? 'happy' : 'idle'} react={cheer} cover={!right} />
      <span className="kicker">{run.daily ? `Daily challenge · ${today()}` : 'Free play'}</span>
      <h1 className="results__score num">{score}</h1>
      <p>
        {right} of {answers.length} right
      </p>
      <ol className="results__rounds">
        {answers.map((a, n) => (
          <li key={run.rounds[n].id} className={a.correct ? 'is-right' : undefined}>
            <span>
              <span className="sr-only">{a.correct ? 'Right: ' : 'Missed: '}</span>
              {run.rounds[n].answer}
            </span>
            <span className="num">+{a.points}</span>
          </li>
        ))}
      </ol>
      {!getToken() && (
        <p>
          Guest scores are not saved. <Link to="/auth">Sign in</Link> to keep your best.
        </p>
      )}
      <div className="game-intro__actions">
        <ClayButton onClick={share}>
          <ShareIcon /> {copied ? 'Copied' : 'Share'}
        </ClayButton>
        <ClayButton variant="ink" onClick={onAgain}>
          Play again
        </ClayButton>
      </div>
    </PaperChip>
  )
}
