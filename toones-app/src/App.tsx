import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'

import PageNotFound from './components/layout/PageNotFound'
import AuthPage from './features/auth/AuthPage'
import DevPage from './dev/DevPage'

import './App.css'

const HomePage = lazy(() => import('./features/home/HomePage'))

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/auth" replace />} />
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
  )
}

export default App
