import { BarChart3 } from 'lucide-react'
import { Link } from 'react-router'

import { DreSummary } from '@/components/report/DreSummary'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { displayName, useAuth } from '@/lib/auth-context'
import { presetPeriod } from '@/lib/periods'
import type { DreReport } from '@/lib/types'
import { useApiResource } from '@/lib/useApiResource'

const currentMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())

export function HomePage() {
  const { user } = useAuth()
  const period = presetPeriod('this-month')
  const report = useApiResource<DreReport>(
    `/api/reports/dre/?date_from=${period.date_from}&date_to=${period.date_to}`,
    'Não foi possível carregar o resumo do mês.',
  )
  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col gap-8">
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

      <section aria-labelledby="titulo-mes" className="flex flex-col gap-4">
        <h2 id="titulo-mes" className="text-xl font-semibold">
          Resumo de {currentMonthName}
        </h2>
        {report.error && (
          <Alert variant="destructive">
            <AlertDescription className="text-base">{report.error}</AlertDescription>
          </Alert>
        )}
        {!report.data && report.loading && <p role="status">Carregando resumo…</p>}
        {report.data && <DreSummary report={report.data} />}
        <div>
          <Button asChild variant="outline">
            <Link to="/prestacao-de-contas">
              <BarChart3 aria-hidden />
              Ver prestação de contas completa
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
