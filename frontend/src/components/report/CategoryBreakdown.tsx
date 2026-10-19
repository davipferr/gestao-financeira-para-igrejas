import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/lib/format'
import type { DreCategory } from '@/lib/types'

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })

type CategoryBreakdownProps = {
  title: string
  total: string
  categories: DreCategory[]
  barClassName: string
}

export function CategoryBreakdown({ title, total, categories, barClassName }: CategoryBreakdownProps) {
  const headingId = `detalhe-${title.toLowerCase()}`
  const totalValue = Number(total)
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-lg font-semibold">
        {title} por categoria
      </h3>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Parte do total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  Nenhum valor no período.
                </TableCell>
              </TableRow>
            )}
            {categories.map((category) => {
              const share = totalValue ? Number(category.total) / totalValue : 0
              return (
                <TableRow key={category.id ?? 'sem-categoria'}>
                  <TableCell className="whitespace-normal">{category.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(category.total)}</TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-2 tabular-nums">
                      {/* A barra só ilustra; a porcentagem escrita ao lado é a informação. */}
                      <span aria-hidden className="hidden h-2 w-20 overflow-hidden rounded-full bg-muted sm:block">
                        <span className={`block h-full ${barClassName}`} style={{ width: `${share * 100}%` }} />
                      </span>
                      {percent.format(share)}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{formatMoney(total)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </section>
  )
}
