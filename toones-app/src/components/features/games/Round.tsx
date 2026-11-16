import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ClayCharacter } from '../../characters/ClayCharacter'
import { ClayButton, IconButton, PaperChip, ReplayIcon, SoundIcon } from '../../ui'
import { preload, useClip, useMuted } from './audio'
import { ROUND_MS, multiplier, pinResult, points, typedMatch, type Answer } from './engine'
import type { GameDef } from './games'
import { MiniGlobe } from './MiniGlobe'
import type { Credit, GameItem, Geo, Mode } from './types'

export function CreditLine({ what, credit }: { what: string; credit: Credit }) {
  return (
    <p className="game-credit">
      {what}: {credit.author},{' '}
      <a href={credit.url} target="_blank" rel="noreferrer">
        {credit.source}
      </a>
      , {credit.license}
    </p>
  )
}

type RoundsProps = { def: GameDef; mode: Mode; rounds: GameItem[]; onDone: (answers: Answer[]) => void }

/** One run of rounds: keeps the score and streak, and the mascot that reacts to each answer. */
export function Rounds({ def, mode, rounds, onDone }: RoundsProps) {
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [muted, toggleMute] = useMuted()
  const item = rounds[i]
  const answer = answers[i]
  const clip = useClip(item.audio, muted)
  const before = answers.slice(0, i)
  const streak = before.length - 1 - before.findLastIndex((a) => !a.correct)
  const score = answers.reduce((sum, a) => sum + a.points, 0)
  const cheers = answers.filter((a) => a.correct).length

  // Fetch what comes next while this round plays
  useEffect(() => {
    preload(rounds[i + 1]?.audio)
    const image = item.reveal.image
    if (image) new Image().src = image
  }, [i, item, rounds])

  return (
    <PaperChip radius="card" className="round">
      <div className="round__head">
        <span className="kicker">
          Round {i + 1} of {rounds.length}
        </span>
        <span className={streak ? 'round__streak num is-hot' : 'round__streak num'} aria-label={`Streak multiplier ${multiplier(streak)}`}>
          ×{multiplier(streak)}
        </span>
        <span className="round__score num" aria-label={`Score ${score}`}>
          {score}
        </span>
        <IconButton variant="quiet" aria-label={muted ? 'Turn sound on' : 'Turn sound off and show text'} aria-pressed={muted} title="Sound (M)" onClick={toggleMute}>
          <SoundIcon off={muted} />
        </IconButton>
      </div>
      <Question
        key={i}
        def={def}
        mode={mode}
        item={item}
        streak={streak}
        answer={answer}
        showCaption={muted || clip.failed || !item.audio}
        replay={item.audio && !clip.failed ? clip.replay : null}
        toggleMute={toggleMute}
        mascot={
          <ClayCharacter
            species={def.species}
            size={[112, 96]}
            mood={answer ? (answer.correct ? 'happy' : 'oh') : clip.playing ? 'talk' : 'idle'}
            cover={!!answer && !answer.points}
            react={cheers}
          />
        }
        onAnswer={(a) => setAnswers((prev) => (prev.length === i ? [...prev, a] : prev))}
        onNext={() => (i + 1 < rounds.length ? setI(i + 1) : onDone(answers))}
        last={i + 1 === rounds.length}
      />
    </PaperChip>
  )
}

type QuestionProps = {
  def: GameDef
  mode: Mode
  item: GameItem
  streak: number
  answer: Answer | undefined
  showCaption: boolean
  replay: (() => void) | null
  toggleMute: () => void
  mascot: ReactNode
  onAnswer: (a: Answer) => void
  onNext: () => void
  last: boolean
}

function Question({ def, mode, item, streak, answer, showCaption, replay, toggleMute, mascot, onAnswer, onNext, last }: QuestionProps) {
  const [left, setLeft] = useState(ROUND_MS)
  const [typed, setTyped] = useState('')
  const [guess, setGuess] = useState<Geo | null>(null)
  const end = useRef(0)
  const nextRef = useRef<HTMLButtonElement>(null)
  const truth = item.reveal.geo

  /** Scores the round. `picked` is null when the clock ran out, which still counts a placed pin or typed text. */
  const settle = (picked: string | null) => {
    const msLeft = end.current - performance.now()
    if (mode === 'pin') {
      const r = guess && truth ? pinResult(guess, truth) : null
      return onAnswer({ picked: null, correct: !!r?.correct, points: r ? points(r.closeness, msLeft, streak) : 0, km: r?.km })
    }
    const value = mode === 'type' ? typed.trim() || null : picked
    const correct = !!value && (mode === 'type' ? typedMatch(value, item.answer) : value === item.answer)
    onAnswer({ picked: value, correct, points: correct ? points(1, msLeft, streak) : 0 })
  }
  const live = useRef({ settle, replay, toggleMute })
  useEffect(() => {
    live.current = { settle, replay, toggleMute }
  })

  useEffect(() => {
    if (answer) return nextRef.current?.focus()
    end.current = performance.now() + ROUND_MS
    const id = window.setInterval(() => {
      const ms = Math.max(0, end.current - performance.now())
      setLeft(ms)
      if (!ms) live.current.settle(null)
    }, 100)
    return () => window.clearInterval(id)
  }, [answer])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      const option = mode === 'choice' && !answer ? item.options[Number(key) - 1] : undefined
      if (key === 'r') live.current.replay?.()
      else if (key === 'm') live.current.toggleMute()
      else if (option) live.current.settle(option)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer, item, mode])

  const verdict = !answer
    ? ''
    : answer.km !== undefined
      ? `${Math.round(answer.km).toLocaleString()} km away`
      : answer.correct
        ? 'Correct!'
        : answer.picked
          ? `Not ${answer.picked}`
          : 'Out of time'

  return (
    <>
      <div className={left < 5000 ? 'round__timer is-low' : 'round__timer'} role="progressbar" aria-label="Time left" aria-valuemin={0} aria-valuemax={ROUND_MS / 1000} aria-valuenow={Math.ceil(left / 1000)}>
        <div style={{ width: `${(left / ROUND_MS) * 100}%` }} />
      </div>

      <div className="round__stage">
        {mascot}
        <div className="round__prompt">
          <h2>{mode === 'pin' ? 'Where is this spoken?' : def.prompt}</h2>
          {replay && (
            <ClayButton variant="ink" className="round__replay" title="Replay (R)" onClick={replay}>
              <ReplayIcon /> Replay
            </ClayButton>
          )}
        </div>
      </div>
      {showCaption && <p className="round__caption">{item.caption}</p>}

      {mode === 'pin' && (
        <div className="round__globe">
          <MiniGlobe label={answer ? `${item.answer}: ${item.reveal.where ?? ''}.` : 'Place your pin.'} guess={guess} target={answer ? truth : null} onPick={answer ? undefined : setGuess} />
        </div>
      )}

      {!answer ? (
        mode === 'choice' ? (
          <div className="round__options" role="group" aria-label="Choices">
            {item.options.map((o, n) => (
              <button key={o} type="button" className="option ui-press" onClick={() => settle(o)}>
                <kbd aria-hidden="true">{n + 1}</kbd>
                {o}
              </button>
            ))}
          </div>
        ) : mode === 'type' ? (
          <form
            className="round__type"
            onSubmit={(e) => {
              e.preventDefault()
              if (typed.trim()) settle(null)
            }}
          >
            <input className="ui-input" autoFocus autoComplete="off" spellCheck={false} aria-label="Your answer" placeholder="Type the language" value={typed} onChange={(e) => setTyped(e.target.value)} />
            <ClayButton type="submit" disabled={!typed.trim()}>
              Lock in
            </ClayButton>
          </form>
        ) : (
          <ClayButton block disabled={!guess} onClick={() => settle(null)}>
            {guess ? 'Lock in pin' : 'Tap the globe to place a pin'}
          </ClayButton>
        )
      ) : (
        <div className="reveal">
          <p className={answer.correct ? 'reveal__verdict is-right' : 'reveal__verdict'} role="status">
            {verdict}
            <span className="num">+{answer.points}</span>
          </p>
          <h2 className="reveal__answer">
            <span className="sr-only">The answer is </span>
            {item.answer}
          </h2>
          <div className="reveal__media">
            {item.reveal.image && <img className="reveal__img" src={item.reveal.image} width={320} height={320} alt={item.answer} decoding="async" />}
            {mode !== 'pin' && truth && <MiniGlobe label={`Globe showing ${item.reveal.where ?? item.answer}.`} target={truth} />}
          </div>
          <dl className="reveal__facts">
            {item.reveal.family && (
              <>
                <dt>Family</dt>
                <dd>{item.reveal.family}</dd>
              </>
            )}
            {item.reveal.where && (
              <>
                <dt>{def.whereLabel}</dt>
                <dd>{item.reveal.where}</dd>
              </>
            )}
          </dl>
          <p className="reveal__fact">{item.reveal.fact}</p>
          <div>
            <CreditLine what={item.audio ? 'Sound' : 'Text'} credit={item.credit} />
            {item.reveal.imageCredit && <CreditLine what="Image" credit={item.reveal.imageCredit} />}
          </div>
          <ClayButton ref={nextRef} block onClick={onNext}>
            {last ? 'See results' : 'Next round'}
          </ClayButton>
        </div>
      )}
    </>
  )
}
