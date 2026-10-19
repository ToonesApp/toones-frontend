import { Link } from 'react-router-dom'
import { Globe } from '../features/home/globe/Globe'
import { PaperChip } from '../ui'
import '../../styles/landing.css'

const LandingPage = () => {
  return (
    <main className="landing">
      <header className="landing__header">
        <PaperChip as="div" radius="pill" className="landing__wordmark">
          TOONES
        </PaperChip>
        <nav className="landing__nav" aria-label="Account">
          <Link className="landing__signin" to="/auth">Sign in</Link>
          <Link className="ui-btn ui-press ui-btn--primary landing__signup" to="/auth">Sign up</Link>
        </nav>
      </header>

      <section className="landing__hero">
        <p className="kicker">An audio-first social map.</p>
        <h1>Hear what you’re missing.</h1>
        <p className="landing__intro">
          Toones is a map of voices. Record a short clip, pin it to the spot
          <br className="landing__desktop-break" /> you’re standing on, and leave it for whoever comes next.
        </p>
        <div className="landing__actions">
          <Link className="ui-btn ui-press ui-btn--primary" to="/auth">Sign up</Link>
          <a className="ui-btn ui-press ui-btn--ghost" href="#how-it-works">How it works</a>
        </div>
      </section>

      <section className="landing__globe" aria-label="A world of voices">
        <Globe landing />
      </section>

      <section id="how-it-works" className="sr-only">
        Record a voice note, pin it to your location, and discover what people have left behind.
      </section>
    </main>
  )
}

export default LandingPage;