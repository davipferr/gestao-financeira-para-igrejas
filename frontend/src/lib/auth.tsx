import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { ApiError, apiRequest } from '@/lib/api'
import { AuthContext, type User } from '@/lib/auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Ao abrir o sistema, verifica se ainda existe uma sessão válida no servidor.
    apiRequest<User>('/api/auth/me/')
      .then(setUser)
      .catch((error: unknown) => {
        if (!(error instanceof ApiError) || error.status !== 403) {
          console.error(error)
        }
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const loggedUser = await apiRequest<User>('/api/auth/login/', {
      method: 'POST',
      body: { username, password },
    })
    setUser(loggedUser)
    return loggedUser
  }, [])

  const logout = useCallback(async () => {
    await apiRequest('/api/auth/logout/', { method: 'POST' })
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
