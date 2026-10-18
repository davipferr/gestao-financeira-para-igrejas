import { displayName, useAuth } from '@/lib/auth-context'

export function HomePage() {
  const { user } = useAuth()
  if (!user) {
    return null
  }

  return (
    <section aria-labelledby="titulo-inicio" className="flex flex-col gap-3">
      <h1 id="titulo-inicio" className="text-2xl font-semibold">
        Olá, {displayName(user)}!
      </h1>
      <p className="max-w-prose text-lg text-muted-foreground">
        {user.role === 'admin'
          ? 'Como administrador, você cadastra os lançamentos, importa o extrato do banco e acompanha o resultado financeiro da igreja.'
          : 'Aqui você acompanha a prestação de contas da igreja: quanto entrou, quanto saiu e o resultado de cada mês.'}
      </p>
    </section>
  )
}
