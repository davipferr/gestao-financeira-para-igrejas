import { useState } from 'react'
import { Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { CategoryFormDialog } from '@/components/CategoryFormDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, apiRequest } from '@/lib/api'
import { KIND_LABELS, type Category, type Kind } from '@/lib/types'
import { useApiResource } from '@/lib/useApiResource'

const SECTION_TITLES: Record<Kind, string> = { income: 'Rendimentos', expense: 'Pagamentos' }

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

export function CategoriesPage() {
  const { data, error: loadError, loading, reload: load } = useApiResource<Category[]>(
    '/api/categories/',
    'Não foi possível carregar as categorias.',
  )
  const categories = data ?? []
  const [editing, setEditing] = useState<{ category: Category | null; kind: Kind } | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  function handleSaved(category: Category) {
    toast.success(editing?.category ? `Categoria "${category.name}" atualizada.` : `Categoria "${category.name}" criada.`)
    setEditing(null)
    load()
  }

  async function toggleActive(category: Category) {
    try {
      await apiRequest(`/api/categories/${category.id}/`, { method: 'PATCH', body: { is_active: !category.is_active } })
      toast.success(category.is_active ? `Categoria "${category.name}" desativada.` : `Categoria "${category.name}" ativada.`)
      load()
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível alterar a categoria.'))
    }
  }

  async function confirmDelete() {
    if (!deleting) {
      return
    }
    const category = deleting
    setDeleting(null)
    try {
      await apiRequest(`/api/categories/${category.id}/`, { method: 'DELETE' })
      toast.success(`Categoria "${category.name}" excluída.`)
      load()
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível excluir a categoria.'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Categorias</h1>
          <p className="text-lg text-muted-foreground">
            Organize os rendimentos e pagamentos da igreja. Categorias desativadas deixam de aparecer nos novos lançamentos.
          </p>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{loadError}</AlertDescription>
        </Alert>
      )}
      {!data && loading && <p role="status">Carregando categorias…</p>}

      {data &&
        (Object.keys(SECTION_TITLES) as Kind[]).map((kind) => {
          const items = categories.filter((category) => category.kind === kind)
          const headingId = `categorias-${kind}`
          return (
            <section key={kind} aria-labelledby={headingId} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id={headingId} className="text-xl font-semibold">
                  {SECTION_TITLES[kind]}
                </h2>
                <Button onClick={() => setEditing({ category: null, kind })}>
                  <Plus aria-hidden />
                  Nova categoria de {KIND_LABELS[kind].toLowerCase()}
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden sm:table-cell">Situação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground">
                          Nenhuma categoria cadastrada.
                        </TableCell>
                      </TableRow>
                    )}
                    {items.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium whitespace-normal">
                          {category.name}
                          <Badge variant={category.is_active ? 'secondary' : 'outline'} className="mt-1 flex sm:hidden">
                            {category.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={category.is_active ? 'secondary' : 'outline'}>
                            {category.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setEditing({ category, kind })}
                              aria-label={`Editar ${category.name}`}
                              title="Editar"
                              className="max-sm:w-11 max-sm:px-0"
                            >
                              <Pencil aria-hidden />
                              <span className="hidden sm:inline">Editar</span>
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => toggleActive(category)}
                              aria-label={`${category.is_active ? 'Desativar' : 'Ativar'} ${category.name}`}
                              title={category.is_active ? 'Desativar' : 'Ativar'}
                              className="max-sm:w-11 max-sm:px-0"
                            >
                              {category.is_active ? <PowerOff aria-hidden /> : <Power aria-hidden />}
                              <span className="hidden sm:inline">{category.is_active ? 'Desativar' : 'Ativar'}</span>
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => setDeleting(category)}
                              aria-label={`Excluir ${category.name}`}
                              title="Excluir"
                              className="max-sm:w-11 max-sm:px-0"
                            >
                              <Trash2 aria-hidden />
                              <span className="hidden sm:inline">Excluir</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )
        })}

      <CategoryFormDialog
        open={editing !== null}
        category={editing?.category ?? null}
        defaultKind={editing?.kind ?? 'income'}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Excluir categoria?"
        description={`A categoria "${deleting?.name ?? ''}" será excluída. Categorias que já têm lançamentos não podem ser excluídas; nesse caso, desative-a.`}
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
