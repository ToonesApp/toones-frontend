import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import PageNotFound from './components/layout/PageNotFound'
import { Preloader } from './components/microcomponents/Preloader'
import AuthPage from './components/features/auth/AuthPage'
import DevPage from './dev/DevPage'
import LandingPage from './components/layout/LandingPage'

import './App.css'

const HomePage = lazy(() => import('./components/features/home/HomePage'))

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
          <Route path="/dev" element={<DevPage />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
    </>
  )
}

export default App
