import { useState } from 'react'
import { ClayCharacter, type Mood } from '../components/characters/ClayCharacter'
import { CATEGORIES, CATEGORY_SPECIES, SPECIES, type SpeciesId } from '../components/characters/clay'
import {
  ClayButton,
  Fab,
  GlobeIcon,
  IconButton,
  LayersIcon,
  LocateIcon,
  MicIcon,
  MinusIcon,
  NightToggle,
  PaperChip,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SegmentedTabs,
} from '../components/ui'
import './dev.css'

const SWATCHES = [
  ['--sky', 'Sky'],
  ['--ink', 'Ink'],
  ['--muted', 'Muted'],
  ['--paper', 'Paper'],
  ['--field', 'Field'],
  ['--well', 'Well / mist'],
  ['--terracotta', 'Terracotta'],
  ['--terracotta-dark', 'Terracotta lip'],
  ['--cream', 'Cream'],
  ['--error', 'Error'],
] as const

const RADII = [
  ['--r-pill', 'Pill'],
  ['--r-card', 'Card 33'],
  ['--r-dialog', 'Dialog 28'],
  ['--r-well', 'Well 27'],
  ['--r-input', 'Input 21'],
  ['--r-icon', 'Icon 18'],
] as const

const MOODS = [
  { value: 'idle', label: 'Idle' },
  { value: 'happy', label: 'Happy' },
  { value: 'oh', label: 'Oh' },
  { value: 'talk', label: 'Talk' },
  { value: 'sleep', label: 'Sleep' },
] as const

const ALL_SPECIES = Object.keys(SPECIES) as SpeciesId[]

export default function DevPage() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [panelTab, setPanelTab] = useState<'drops' | 'places'>('drops')
  const [mood, setMood] = useState<Mood>('idle')
  const [cover, setCover] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [visible, setVisible] = useState(() => new Set(CATEGORIES))

  const toggleCat = (c: (typeof CATEGORIES)[number]) =>
    setVisible((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })

  return (
    <main className="dev">
      <header className="dev-header">
        <PaperChip as="span" className="dev-wordmark">TOONES</PaperChip>
        <SegmentedTabs
          aria-label="Account"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'in', label: 'Sign in' },
            { value: 'up', label: 'Sign up' },
          ]}
        />
        <NightToggle />
      </header>

      <PaperChip as="section" radius="card" className="dev-card">
        <div className="kicker">Tokens</div>
        <h2>Color</h2>
        <div className="dev-swatches">
          {SWATCHES.map(([v, label]) => (
            <div key={v} className="dev-swatch">
              <span style={{ background: `var(${v})` }} />
              <div>
                <div>{label}</div>
                <code>{v}</code>
              </div>
            </div>
          ))}
        </div>
        <h2>Category fills</h2>
        <div className="dev-swatches">
          {CATEGORIES.map((c) => {
            const sp = SPECIES[CATEGORY_SPECIES[c]]
            return (
              <div key={c} className="dev-swatch">
                <span style={{ background: sp.fill, boxShadow: `inset 0 -6px 0 ${sp.lip}` }} />
                <div>
                  <div>{c}</div>
                  <code>{sp.fill}</code>
                </div>
              </div>
            )
          })}
        </div>
        <h2>Radii</h2>
        <div className="dev-row">
          {RADII.map(([v, label]) => (
            <div key={v} className="dev-radius" style={{ borderRadius: `var(${v})` }}>
              {label}
            </div>
          ))}
        </div>
        <h2>Type</h2>
        <div className="dev-type">
          <div className="kicker">Kicker · Welcome back</div>
          <div className="dev-title">Pick up where you left off.</div>
          <p className="dev-body">Your drops, your friends, your footprints are waiting.</p>
          <div className="dev-stat num">0:42</div>
        </div>
      </PaperChip>

      <PaperChip as="section" radius="card" className="dev-card">
        <div className="kicker">components/ui</div>
        <h2>ClayButton</h2>
        <div className="dev-row">
          <ClayButton>Sign in</ClayButton>
          <ClayButton variant="ink">Stop</ClayButton>
          <ClayButton variant="ghost">Redo</ClayButton>
          <ClayButton disabled>Disabled</ClayButton>
        </div>
        <div className="dev-row dev-block">
          <ClayButton block>Create account</ClayButton>
          <ClayButton variant="ghost" block>Continue with Apple</ClayButton>
        </div>
        <h2>Fab and IconButton</h2>
        <div className="dev-row">
          <Fab aria-label="Record a Toone">
            <MicIcon />
          </Fab>
          <IconButton aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
          <IconButton size="sm" aria-label="Play">
            <PlayIcon size={14} />
          </IconButton>
          <PaperChip radius="rail" className="dev-ctl-col">
            <IconButton variant="quiet" aria-label="Zoom in"><PlusIcon /></IconButton>
            <IconButton variant="quiet" aria-label="Zoom out"><MinusIcon /></IconButton>
            <IconButton variant="quiet" aria-label="Go to my location"><LocateIcon /></IconButton>
            <IconButton variant="quiet" aria-label="Zoom out to whole Earth"><GlobeIcon /></IconButton>
            <IconButton variant="quiet" aria-label="Map layers"><LayersIcon /></IconButton>
          </PaperChip>
        </div>
        <h2>SegmentedTabs</h2>
        <div className="dev-row">
          <SegmentedTabs
            aria-label="Account"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'in', label: 'Sign in' },
              { value: 'up', label: 'Sign up' },
            ]}
          />
          <SegmentedTabs
            aria-label="Panel view"
            surface="well"
            value={panelTab}
            onChange={setPanelTab}
            options={[
              { value: 'drops', label: 'Drops' },
              { value: 'places', label: 'Places' },
            ]}
          />
        </div>
        <h2>PaperChip</h2>
        <div className="dev-row">
          <PaperChip as="span" className="dev-pill num">
            <b>Lv 2</b> <span className="dev-muted">140 xp</span>
          </PaperChip>
          <PaperChip radius="well" className="dev-pad">Row · radius 27</PaperChip>
          <PaperChip radius="card" className="dev-pad">Card · radius 33</PaperChip>
        </div>
      </PaperChip>

      <PaperChip as="section" radius="card" className="dev-card">
        <div className="kicker">components/characters</div>
        <h2>ClayCharacter</h2>
        <p className="dev-body">Eyes follow the cursor. Hover to wiggle and wave, click to hop and play notes. Moods apply to all.</p>
        <div className="dev-row">
          <SegmentedTabs aria-label="Mood" surface="well" value={mood} onChange={setMood} options={MOODS} />
          <ClayButton variant="ghost" onClick={() => setCover((c) => !c)} aria-pressed={cover}>
            {cover ? 'Uncover eyes' : 'Cover eyes'}
          </ClayButton>
        </div>
        <div className="dev-cast">
          {ALL_SPECIES.map((id) => (
            <figure key={id}>
              <ClayCharacter species={id} size={[180, 220]} mood={mood} cover={cover} interactive idleWaves />
              <figcaption>
                {SPECIES[id].name}
                <span className="dev-muted"> · {SPECIES[id].category ?? 'Auth only'}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <h2>Rail cells (48px)</h2>
        <PaperChip radius="rail" role="toolbar" aria-label="Show categories" className="dev-rail">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className="dev-cell" aria-pressed={visible.has(c)} title={c} onClick={() => toggleCat(c)}>
              <ClayCharacter species={CATEGORY_SPECIES[c]} size={48} mood={mood === 'sleep' ? 'sleep' : 'idle'} />
              <span className="sr-only">{c}</span>
            </button>
          ))}
        </PaperChip>
        <h2>Small faces (24 / 30 / 36)</h2>
        <div className="dev-row">
          {[24, 30, 36].map((s) => (
            <div key={s} className="dev-row">
              {CATEGORIES.map((c) => (
                <ClayCharacter key={c} species={CATEGORY_SPECIES[c]} size={s} fill={0.95} />
              ))}
            </div>
          ))}
        </div>
      </PaperChip>
    </main>
  )
}
