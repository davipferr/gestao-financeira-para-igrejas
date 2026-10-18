import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Leva o foco até a mensagem de erro para que leitores de tela a anunciem.
    if (error) {
      errorRef.current?.focus()
    }
  }, [error])

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError('Preencha o usuário e a senha para entrar.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await login(username.trim(), password)
      const from = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(from, { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível entrar. Tente novamente.')
      setSubmitting(false)
    }
  }

  return (
    <main id="conteudo" className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="gap-2 text-center">
          <CardTitle>
            <h1 className="text-2xl font-semibold">Gestão Financeira para Igrejas</h1>
          </CardTitle>
          <CardDescription className="text-base">
            Entre com o usuário e a senha que você recebeu da igreja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {error && (
              <Alert variant="destructive" ref={errorRef} tabIndex={-1} id="login-erro">
                <AlertDescription className="text-base">{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-erro' : undefined}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Senha</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'login-erro' : undefined}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </Button>
              </div>
            </div>

            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              <LogIn aria-hidden />
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
