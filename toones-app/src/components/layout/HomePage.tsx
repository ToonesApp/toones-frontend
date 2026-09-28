import { useState } from 'react'

type Scene = 'Globe' | 'Street' | 'VR'

const categories = [
  { name: 'Nature', symbol: '✦' },
  { name: 'Language', symbol: 'Aa' },
  { name: 'Culture', symbol: '◌' },
  { name: 'Music', symbol: '♪' },
  { name: 'City', symbol: '▥' },
]

const MicIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="8" y="3" width="8" height="12" rx="4" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
  </svg>
)

const HomePage = () => {
  const [scene, setScene] = useState<Scene>('Globe')
  const [activeCategory, setActiveCategory] = useState('All sounds')
  const [isRecording, setIsRecording] = useState(false)
  const [title, setTitle] = useState('')

  const sceneHint = scene === 'Globe' ? 'Revolve Earth' : scene === 'Street' ? 'Tap a street to listen' : 'Explore in VR'
  const closeRecorder = () => { setIsRecording(false); setTitle('') }

  return (
    <main className="home-shell">
      <div className="sky-layer" aria-hidden="true" />
      <div className="globe-scene" aria-label="A quiet globe ready for sound drops">
        <div className="globe" aria-hidden="true"><span className="continent continent-one" /><span className="continent continent-two" /><span className="continent continent-three" /><span className="globe-highlight" /></div>
        <div className="map-shadow" aria-hidden="true" />
      </div>
      <header className="hud top-hud">
        <div className="brand-cluster">
          <a className="wordmark paper-chip" href="/" aria-label="TOONES home">TOONES</a>
          <div className="scene-switcher paper-chip" role="tablist" aria-label="Scene">
            {(['Globe', 'Street', 'VR'] as Scene[]).map((item) => <button key={item} className={scene === item ? 'scene-tab selected' : 'scene-tab'} type="button" role="tab" aria-selected={scene === item} title={item === scene ? sceneHint : item} onClick={() => setScene(item)}>{item}</button>)}
          </div>
          <span className="hud-hint">{sceneHint}</span>
        </div>
        <a className="xp-chip paper-chip" href="#profile" aria-label="Level 1, 0 experience points">Lv 1 <span>·</span> 0 xp</a>
      </header>
      <div className="category-wrap hud">
        <div className="category-rail paper-chip" role="toolbar" aria-label="Sound categories">
          <button className={activeCategory === 'All sounds' ? 'category-cell active' : 'category-cell'} type="button" aria-pressed={activeCategory === 'All sounds'} title="All sounds" onClick={() => setActiveCategory('All sounds')}><span className="category-symbol all-symbol">●</span><span className="sr-only">All sounds</span></button>
          {categories.map((category) => <button className={activeCategory === category.name ? 'category-cell active' : 'category-cell'} type="button" aria-pressed={activeCategory === category.name} title={category.name} key={category.name} onClick={() => setActiveCategory(category.name)}><span className="category-symbol">{category.symbol}</span><span className="sr-only">{category.name}</span></button>)}
        </div>
      </div>
      <section className="empty-notice paper-chip" aria-live="polite"><span className="kicker">{activeCategory === 'All sounds' ? 'The world is listening' : activeCategory}</span><h1>Earth is quiet.</h1><p>Drop a Toone somewhere you know. Let a place keep its sound.</p></section>
      {scene === 'Street' && <div className="scene-notice paper-chip"><span className="kicker">Street · Mapillary</span><strong>Zoom in, then tap a terracotta street.</strong></div>}
      {scene === 'VR' && <div className="scene-notice paper-chip"><span className="kicker">VR view</span><strong>Choose a drop on Earth to enter VR.</strong></div>}
      <div className="bottom-actions hud"><button className="record-fab" type="button" aria-label="Record a Toone" onClick={() => setIsRecording(true)}><MicIcon /></button></div>
      {isRecording && <div className="modal-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeRecorder()}><section className="record-sheet paper-chip" role="dialog" aria-modal="true" aria-labelledby="record-title"><div className="sheet-header"><div><span className="kicker">New drop</span><h2 id="record-title">Drop a Toone</h2></div><button className="close-button" type="button" onClick={closeRecorder} aria-label="Close recorder">×</button></div><div className="recorder-well"><span className="pulse-dot" /><strong>Ready to record</strong><span className="timer">00:00</span></div><label className="field-label" htmlFor="toone-title">Title <span>Optional</span></label><input id="toone-title" maxLength={48} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A name for this sound" /><div className="sheet-actions"><button className="clay-button ink-button" type="button" onClick={closeRecorder}>Stop</button><button className="clay-button primary-button" type="button" onClick={closeRecorder}><MicIcon /> Record</button></div></section></div>}
    </main>
  )
}

export default HomePage