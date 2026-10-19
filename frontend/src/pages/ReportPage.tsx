import { lazy, Suspense, useState, type FormEvent } from 'react'

import { CategoryBreakdown } from '@/components/report/CategoryBreakdown'
import { DreSummary } from '@/components/report/DreSummary'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { formatDate } from '@/lib/format'
import { PERIOD_LABELS, presetPeriod, type Period, type PeriodPreset } from '@/lib/periods'
import type { DreReport } from '@/lib/types'
import { useApiResource } from '@/lib/useApiResource'

// O gráfico usa uma biblioteca grande; ela só é baixada quando esta página é aberta,
// deixando a primeira carga do sistema mais leve, principalmente no celular.
const MonthlyChart = lazy(() => import('@/components/report/MonthlyChart').then((module) => ({ default: module.MonthlyChart })))

export function ReportPage() {
  const [preset, setPreset] = useState<PeriodPreset>('this-month')
  const [period, setPeriod] = useState<Period>(() => presetPeriod('this-month'))
  const [customDraft, setCustomDraft] = useState<Period>(period)
  const [customError, setCustomError] = useState('')
  const report = useApiResource<DreReport>(
    `/api/reports/dre/?date_from=${period.date_from}&date_to=${period.date_to}`,
    'Não foi possível carregar a prestação de contas.',
  )

  function changePreset(value: PeriodPreset) {
    setPreset(value)
    setCustomError('')
    if (value === 'custom') {
      setCustomDraft(period)
    } else {
      setPeriod(presetPeriod(value))
    }
  }

  function applyCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!customDraft.date_from || !customDraft.date_to) {
      setCustomError('Informe a data inicial e a data final.')
      return
    }
    if (customDraft.date_from > customDraft.date_to) {
      setCustomError('A data final não pode ser anterior à data inicial.')
      return
    }
    setCustomError('')
    setPeriod(customDraft)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Prestação de contas</h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          Quanto a igreja recebeu, quanto gastou e o resultado do período. Os valores são totais por categoria, sem
          identificar quem contribuiu.
        </p>
      </div>

      <form onSubmit={applyCustom} aria-label="Período do relatório" className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="report-period">Período</Label>
          <NativeSelect
            id="report-period"
            value={preset}
            onChange={(event) => changePreset(event.target.value as PeriodPreset)}
          >
            {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((key) => (
              <NativeSelectOption key={key} value={key}>
                {PERIOD_LABELS[key]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {preset === 'custom' && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="report-date-from">De</Label>
              <Input
                id="report-date-from"
                type="date"
                value={customDraft.date_from}
                onChange={(event) => setCustomDraft({ ...customDraft, date_from: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="report-date-to">Até</Label>
              <Input
                id="report-date-to"
                type="date"
                value={customDraft.date_to}
                onChange={(event) => setCustomDraft({ ...customDraft, date_to: event.target.value })}
              />
            </div>
            <Button type="submit">Ver período</Button>
          </>
        )}
        {customError && (
          <p role="alert" className="w-full text-base text-destructive">
            {customError}
          </p>
        )}
      </form>

      <p role="status" className="text-base text-muted-foreground">
        {report.loading
          ? 'Carregando relatório…'
          : `Período de ${formatDate(period.date_from)} a ${formatDate(period.date_to)}.`}
      </p>

      {report.error && (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{report.error}</AlertDescription>
        </Alert>
      )}

      {report.data && (
        <>
          <section aria-labelledby="titulo-resumo" className="flex flex-col gap-3">
            <h2 id="titulo-resumo" className="sr-only">
              Resumo do período
            </h2>
            <DreSummary report={report.data} />
          </section>

          <section aria-labelledby="titulo-evolucao" className="flex flex-col gap-3">
            <h2 id="titulo-evolucao" className="text-xl font-semibold">
              Evolução no período
            </h2>
            <Suspense fallback={<p role="status">Carregando gráfico…</p>}>
              <MonthlyChart months={report.data.monthly} />
            </Suspense>
          </section>

          <section aria-labelledby="titulo-detalhes" className="flex flex-col gap-6">
            <h2 id="titulo-detalhes" className="text-xl font-semibold">
              Detalhamento (DRE)
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <CategoryBreakdown
                title="Rendimentos"
                total={report.data.income.total}
                categories={report.data.income.categories}
                barClassName="bg-emerald-700"
              />
              <CategoryBreakdown
                title="Pagamentos"
                total={report.data.expense.total}
                categories={report.data.expense.categories}
                barClassName="bg-red-700"
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
