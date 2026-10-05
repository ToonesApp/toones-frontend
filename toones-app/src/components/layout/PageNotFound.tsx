import { Link } from 'react-router-dom'
import { PaperChip } from '../ui'

const PageNotFound = () => {
  return (
    <main className="not-found-shell">
      <PaperChip radius="card" className="not-found-card">
        <span className="kicker">Signal lost</span>
        <p className="not-found-code num">404</p>
        <h1>That place is not on Earth.</h1>
        <p className="not-found-copy">The sound you are looking for may have drifted somewhere else.</p>
        <Link className="ui-btn ui-press ui-btn--primary return-button" to="/">
          Return to Earth
        </Link>
      </PaperChip>
    </main>
  )
}

export default PageNotFound
