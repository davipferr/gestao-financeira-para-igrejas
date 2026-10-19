import { ArrowDownCircle, ArrowUpCircle, Scale } from 'lucide-react'

import { formatMoney, formatSignedMoney } from '@/lib/format'
import type { DreReport } from '@/lib/types'
import { cn } from '@/lib/utils'

type CardProps = {
  label: string
  value: string
  detail: string
  icon: typeof Scale
  tone: 'income' | 'expense' | 'neutral'
}

function SummaryCard({ label, value, detail, icon: Icon, tone }: CardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-5">
      <p className="flex items-center gap-2 text-base text-muted-foreground">
        <Icon aria-hidden className="size-5" />
        {label}
      </p>
      <p
        className={cn(
          'text-3xl font-semibold tabular-nums',
          tone === 'income' && 'text-emerald-700',
          tone === 'expense' && 'text-red-700',
        )}
      >
        {value}
      </p>
      <p className="text-base text-muted-foreground">{detail}</p>
    </div>
  )
}

export function DreSummary({ report }: { report: DreReport }) {
  const isSurplus = report.result_label === 'Superávit'
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SummaryCard
        label="Rendimentos"
        value={formatMoney(report.income.total)}
        detail="Tudo o que entrou no período"
        icon={ArrowUpCircle}
        tone="income"
      />
      <SummaryCard
        label="Pagamentos"
        value={formatMoney(report.expense.total)}
        detail="Tudo o que saiu no período"
        icon={ArrowDownCircle}
        tone="expense"
      />
      {/* O resultado diz em palavras se sobrou ou faltou dinheiro, além do sinal e da cor. */}
      <SummaryCard
        label={`Resultado: ${report.result_label}`}
        value={formatSignedMoney(report.result)}
        detail={isSurplus ? 'Entrou mais do que saiu' : 'Saiu mais do que entrou'}
        icon={Scale}
        tone={isSurplus ? 'income' : 'expense'}
      />
    </div>
  )
}
