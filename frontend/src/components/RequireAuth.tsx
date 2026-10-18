import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { useAuth } from '@/lib/auth-context'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <p role="status" className="p-8 text-center text-lg">
        Carregando…
      </p>
    )
  }
  if (!user) {
    // Guarda a página pedida para voltar a ela depois do login.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
