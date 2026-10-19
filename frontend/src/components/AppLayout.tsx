import { useState } from 'react'
import { BarChart3, FileUp, History, House, ListOrdered, LogOut, Tags } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { displayName, useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: House, adminOnly: false },
  { to: '/prestacao-de-contas', label: 'Prestação de contas', icon: BarChart3, adminOnly: false },
  { to: '/lancamentos', label: 'Lançamentos', icon: ListOrdered, adminOnly: true },
  { to: '/categorias', label: 'Categorias', icon: Tags, adminOnly: true },
  { to: '/importar', label: 'Importar extrato', icon: FileUp, adminOnly: true },
  { to: '/acessos', label: 'Acessos', icon: History, adminOnly: true },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [logoutError, setLogoutError] = useState('')

  async function handleLogout() {
    setLogoutError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(error instanceof ApiError ? error.message : 'Não foi possível sair. Tente novamente.')
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      {/* Atalho para quem navega pelo teclado ou leitor de tela pular direto ao conteúdo. */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>

      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-lg font-semibold">Gestão Financeira para Igrejas</p>
          {user && (
            <div className="flex items-center gap-3">
              <p className="text-base">
                <span className="font-medium">{displayName(user)}</span>{' '}
                <span className="text-muted-foreground">({user.role_display})</span>
              </p>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut aria-hidden />
                Sair
              </Button>
            </div>
          )}
        </div>
        <nav aria-label="Menu principal" className="mx-auto max-w-6xl px-4">
          <ul className="flex flex-wrap gap-1">
            {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin').map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end
                  className={({ isActive }) =>
                    cn(
                      'inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      isActive ? 'border-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground',
                    )
                  }
                >
                  <Icon aria-hidden className="size-5" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {logoutError && (
        <p role="alert" className="mx-auto mt-4 w-full max-w-6xl px-4 text-base text-destructive">
          {logoutError}
        </p>
      )}

      <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
