import { Link } from 'react-router-dom'

const PageNotFound = () => {
  return (
    <main className="not-found-shell">
      <div className="not-found-card paper-chip">
        <span className="kicker">Signal lost</span>
        <p className="not-found-code">404</p>
        <h1>That place is not on Earth.</h1>
        <p className="not-found-copy">The sound you are looking for may have drifted somewhere else.</p>
        <Link className="clay-button primary-button return-button" to="/">Return to Earth</Link>
      </div>
    </main>
  )
}

export default PageNotFound