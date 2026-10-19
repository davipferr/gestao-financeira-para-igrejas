import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney, formatSignedMoney } from '@/lib/format'
import { formatMonthLong, formatMonthShort } from '@/lib/periods'
import type { DreMonth } from '@/lib/types'

// Verde e vermelho escuros, com contraste suficiente sobre fundo branco.
const chartConfig = {
  income: { label: 'Rendimentos', color: '#047857' },
  expense: { label: 'Pagamentos', color: '#b91c1c' },
} satisfies ChartConfig

const compactMoney = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function MonthlyChart({ months }: { months: DreMonth[] }) {
  const data = months.map((month) => ({
    month: formatMonthShort(month.month),
    income: Number(month.income),
    expense: Number(month.expense),
  }))

  return (
    <figure aria-labelledby="grafico-mensal-titulo" className="flex flex-col gap-3">
      <figcaption id="grafico-mensal-titulo" className="text-lg font-semibold">
        Rendimentos e pagamentos mês a mês
      </figcaption>
      <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
        <BarChart data={data} accessibilityLayer margin={{ left: 8, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={72} tickFormatter={(value: number) => compactMoney.format(value)} />
          <ChartTooltip
            content={<ChartTooltipContent formatter={(value, name) => `${chartConfig[name as keyof typeof chartConfig].label}: ${formatMoney(Number(value))}`} />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="income" fill="var(--color-income)" radius={4} />
          <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
        </BarChart>
      </ChartContainer>

      {/* Os mesmos números do gráfico em forma de tabela, para quem usa leitor de tela ou prefere ler os valores. */}
      <details className="rounded-lg border p-3 text-base">
        <summary className="min-h-11 cursor-pointer py-2 font-medium">Ver os valores mês a mês em tabela</summary>
        <div className="mt-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Rendimentos</TableHead>
                <TableHead className="text-right">Pagamentos</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((month) => (
                <TableRow key={month.month}>
                  <TableCell>{formatMonthLong(month.month, { capitalize: true })}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(month.income)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(month.expense)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatSignedMoney(month.result)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </figure>
  )
}
