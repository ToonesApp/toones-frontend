import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import PageNotFound from './components/layout/PageNotFound'
import { Preloader } from './components/microcomponents/Preloader'
import AuthPage from './components/features/auth/AuthPage'
import { RequireAuth } from './components/features/auth/RequireAuth'
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from './components/features/auth/RecoverPage'
import LandingPage from './components/layout/LandingPage'

import './App.css'

const HomePage = lazy(() => import('./components/features/home/HomePage'))
const FeedPage = lazy(() => import('./components/features/feed/FeedPage'))
// The design-system showcase ships only in dev builds; in production the import is dead code and tree-shaken out.
const DevPage = import.meta.env.DEV ? lazy(() => import('./dev/DevPage')) : null

function App() {
  return (
    <>
      <Preloader />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route
            path="/home"
            element={
              <RequireAuth>
                <Suspense fallback={null}>
                  <HomePage />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/feed/*"
            element={
              <RequireAuth>
                <Suspense fallback={null}>
                  <FeedPage />
                </Suspense>
              </RequireAuth>
            }
          />
          {DevPage && (
            <Route
              path="/dev"
              element={
                <Suspense fallback={null}>
                  <DevPage />
                </Suspense>
              }
            />
          )}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
    </>
  )
}

export default App
