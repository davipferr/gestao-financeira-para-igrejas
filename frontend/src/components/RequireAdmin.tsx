import type { ReactNode } from 'react'

import { useAuth } from '@/lib/auth-context'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'admin') {
    return (
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Acesso restrito</h1>
        <p className="text-lg text-muted-foreground">Esta página é exclusiva para administradores do sistema.</p>
      </section>
    )
  }
  return children
}
