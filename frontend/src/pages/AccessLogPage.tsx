import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/format'
import type { AccessLog, Paginated } from '@/lib/types'
import { useApiResource } from '@/lib/useApiResource'

const PAGE_SIZE = 20

export function AccessLogPage() {
  const [page, setPage] = useState(1)
  const logs = useApiResource<Paginated<AccessLog>>(
    `/api/access-logs/?page=${page}`,
    'Não foi possível carregar o registro de acessos.',
  )
  const totalPages = logs.data ? Math.max(1, Math.ceil(logs.data.count / PAGE_SIZE)) : 1

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Registro de acessos</h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          Cada entrada no sistema fica registrada com o nome de quem acessou, a data e o horário. Este registro não
          pode ser alterado.
        </p>
      </div>

      {logs.error && (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{logs.error}</AlertDescription>
        </Alert>
      )}

      <p role="status" className="text-base text-muted-foreground">
        {logs.loading
          ? 'Carregando acessos…'
          : logs.data && `${logs.data.count} ${logs.data.count === 1 ? 'acesso registrado' : 'acessos registrados'}.`}
      </p>

      {logs.data && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Usuário</TableHead>
                <TableHead>Data e horário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.data.results.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    Nenhum acesso registrado ainda.
                  </TableCell>
                </TableRow>
              )}
              {logs.data.results.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-normal">{log.full_name || log.username}</TableCell>
                  <TableCell className="hidden sm:table-cell">{log.username}</TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(log.accessed_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {logs.data && logs.data.count > PAGE_SIZE && (
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
    </div>
  )
}
