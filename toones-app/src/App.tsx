import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import PageNotFound from './components/layout/PageNotFound'
import { Preloader } from './components/microcomponents/Preloader'
import AuthPage from './components/features/auth/AuthPage'
import DevPage from './dev/DevPage'
import LandingPage from './components/layout/LandingPage'

import './App.css'

const HomePage = lazy(() => import('./components/features/home/HomePage'))
const FeedPage = lazy(() => import('./components/features/feed/FeedPage'))
const GamesPage = lazy(() => import('./components/features/games/GamesPage'))

function App() {
  return (
    <>
      <Preloader />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/home"
            element={
              <Suspense fallback={null}>
                <HomePage />
              </Suspense>
            }
          />
          <Route
            path="/feed/*"
            element={
              <Suspense fallback={null}>
                <FeedPage />
              </Suspense>
            }
          />
          <Route
            path="/games/*"
            element={
              <Suspense fallback={null}>
                <GamesPage />
              </Suspense>
            }
          />
          <Route path="/dev" element={<DevPage />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
    </>
  )
}

export default App
