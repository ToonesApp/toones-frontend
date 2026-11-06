import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { getToken } from '../../lib/api'

/**
 * Gate for the app routes. Logged-out visitors are sent to the sign-in page instead of
 * into the app, and we remember where they were headed so sign-in can return them there.
 * This is a client-side guard only; the backend must still reject unauthenticated calls.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()

  if (!getToken()) {
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />
  }

  return <>{children}</>
}
