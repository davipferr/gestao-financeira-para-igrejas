import { useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { TransactionFormDialog } from '@/components/TransactionFormDialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, apiRequest } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import type { Category, Paginated, Transaction } from '@/lib/types'
import { useApiResource } from '@/lib/useApiResource'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

type Filters = {
  date_from: string
  date_to: string
  kind: string
  category: string
  search: string
}

const EMPTY_FILTERS: Filters = { date_from: '', date_to: '', kind: '', category: '', search: '' }

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function filtersFromUrl(searchParams: URLSearchParams): Filters {
  const filters = { ...EMPTY_FILTERS }
  for (const key of Object.keys(filters) as (keyof Filters)[]) {
    filters[key] = searchParams.get(key) ?? ''
  }
  return filters
}

export function TransactionsPage() {
  // Os filtros iniciais podem vir da URL, por exemplo ao abrir "/lancamentos?category=none"
  // pelo botão de classificar os lançamentos importados.
  const [searchParams] = useSearchParams()
  const [draft, setDraft] = useState<Filters>(() => filtersFromUrl(searchParams))
  const [filters, setFilters] = useState<Filters>(() => filtersFromUrl(searchParams))
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<{ transaction: Transaction | null } | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  const params = new URLSearchParams({ page: String(page) })
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  const {
    data,
    error: loadError,
    loading,
    reload: load,
  } = useApiResource<Paginated<Transaction>>(`/api/transactions/?${params}`, 'Não foi possível carregar os lançamentos.')
  const { data: categoryData, error: categoriesError } = useApiResource<Category[]>(
    '/api/categories/',
    'Não foi possível carregar as categorias.',
  )
  const categories = categoryData ?? []

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setFilters({ ...draft, search: draft.search.trim() })
  }

  function clearFilters() {
    setDraft(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  function handleSaved() {
    toast.success(editing?.transaction ? 'Lançamento atualizado.' : 'Lançamento salvo.')
    setEditing(null)
    load()
  }

  async function confirmDelete() {
    if (!deleting) {
      return
    }
    const transaction = deleting
    setDeleting(null)
    try {
      await apiRequest(`/api/transactions/${transaction.id}/`, { method: 'DELETE' })
      toast.success('Lançamento excluído.')
      if (data && data.results.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        load()
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível excluir o lançamento.'))
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1
  const filterCategories = categories.filter((category) => !draft.kind || category.kind === draft.kind)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Lançamentos</h1>
          <p className="text-lg text-muted-foreground">Entradas e saídas de dinheiro da igreja.</p>
        </div>
        <Button onClick={() => setEditing({ transaction: null })}>
          <Plus aria-hidden />
          Novo lançamento
        </Button>
      </div>

      <form
        onSubmit={applyFilters}
        aria-label="Filtros dos lançamentos"
        className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="flex flex-col gap-2 lg:col-span-1">
          <Label htmlFor="filter-date-from">De</Label>
          <Input
            id="filter-date-from"
            type="date"
            value={draft.date_from}
            onChange={(event) => setDraft({ ...draft, date_from: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2 lg:col-span-1">
          <Label htmlFor="filter-date-to">Até</Label>
          <Input
            id="filter-date-to"
            type="date"
            value={draft.date_to}
            onChange={(event) => setDraft({ ...draft, date_to: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2 lg:col-span-1">
          <Label htmlFor="filter-kind">Tipo</Label>
          <NativeSelect
            id="filter-kind"
            className="w-full"
            value={draft.kind}
            onChange={(event) => setDraft({ ...draft, kind: event.target.value, category: '' })}
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            <NativeSelectOption value="income">Rendimentos</NativeSelectOption>
            <NativeSelectOption value="expense">Pagamentos</NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2 lg:col-span-1">
          <Label htmlFor="filter-category">Categoria</Label>
          <NativeSelect
            id="filter-category"
            className="w-full"
            value={draft.category}
            onChange={(event) => setDraft({ ...draft, category: event.target.value })}
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            <NativeSelectOption value="none">Sem categoria</NativeSelectOption>
            {filterCategories.map((category) => (
              <NativeSelectOption key={category.id} value={String(category.id)}>
                {category.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-2">
          <Label htmlFor="filter-search">Buscar na descrição</Label>
          <Input
            id="filter-search"
            type="search"
            value={draft.search}
            onChange={(event) => setDraft({ ...draft, search: event.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit">
            <Search aria-hidden />
            Filtrar
          </Button>
          <Button type="button" variant="outline" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      </form>

      {(loadError || categoriesError) && (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{loadError ?? categoriesError}</AlertDescription>
        </Alert>
      )}

      <p role="status" className="text-base text-muted-foreground">
        {loading
          ? 'Carregando lançamentos…'
          : data && `${data.count} ${data.count === 1 ? 'lançamento encontrado' : 'lançamentos encontrados'}.`}
      </p>

      {data && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Nenhum lançamento encontrado.
                  </TableCell>
                </TableRow>
              )}
              {data.results.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="hidden sm:table-cell">{formatDate(transaction.date)}</TableCell>
                  <TableCell className="max-w-xs whitespace-normal">
                    {transaction.description}
                    {transaction.imported && (
                      <Badge variant="outline" className="ml-2">
                        Importado
                      </Badge>
                    )}
                    {/* Em telas pequenas, data e categoria aparecem aqui, abaixo da descrição. */}
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground md:hidden">
                      <span className="sm:hidden">{formatDate(transaction.date)}</span>
                      {transaction.category_name ?? <Badge variant="destructive">Sem categoria</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {transaction.category_name ?? <Badge variant="destructive">Sem categoria</Badge>}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{transaction.kind_display}</TableCell>
                  {/* O sinal acompanha a cor para não depender só dela (informação de fácil percepção). */}
                  <TableCell
                    className={cn(
                      'text-right font-medium tabular-nums',
                      transaction.kind === 'income' ? 'text-emerald-700' : 'text-red-700',
                    )}
                  >
                    {transaction.kind === 'income' ? '+ ' : '− '}
                    {formatMoney(transaction.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setEditing({ transaction })}
                        aria-label={`Editar ${transaction.description}`}
                        title="Editar"
                        className="max-xl:w-11 max-xl:px-0"
                      >
                        <Pencil aria-hidden />
                        <span className="hidden xl:inline">Editar</span>
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setDeleting(transaction)}
                        aria-label={`Excluir ${transaction.description}`}
                        title="Excluir"
                        className="max-xl:w-11 max-xl:px-0"
                      >
                        <Trash2 aria-hidden />
                        <span className="hidden xl:inline">Excluir</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && data.count > PAGE_SIZE && (
        <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft aria-hidden />
            Anterior
          </Button>
          <p className="text-base">
            Página {page} de {totalPages}
          </p>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Próxima
            <ChevronRight aria-hidden />
          </Button>
        </nav>
      )}

      <TransactionFormDialog
        open={editing !== null}
        transaction={editing?.transaction ?? null}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Excluir lançamento?"
        description={
          deleting
            ? `O lançamento "${deleting.description}" de ${formatMoney(deleting.amount)} em ${formatDate(deleting.date)} será excluído. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
