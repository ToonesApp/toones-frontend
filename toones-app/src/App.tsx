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
      {/* Above the routes so a transition into a lazy page keeps the old page on screen instead of a blank fallback */}
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/dev" element={<DevPage />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
