import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Download, FileUp, ListChecks } from 'lucide-react'
import { Link } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, apiRequest } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { Paginated, StatementImport } from '@/lib/types'
import { useApiResource } from '@/lib/useApiResource'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['ofx', 'csv']

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

/** Confere o arquivo no navegador, antes de enviar, para avisar o problema na hora. */
function validateFile(file: File | null) {
  if (!file) {
    return 'Selecione o arquivo do extrato (.ofx ou .csv).'
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return 'Formato não suportado. Envie um arquivo .ofx ou .csv.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'O arquivo deve ter no máximo 2 MB.'
  }
  return ''
}

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<StatementImport | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const history = useApiResource<Paginated<StatementImport>>(
    '/api/imports/',
    'Não foi possível carregar o histórico de importações.',
  )

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  useEffect(() => {
    if (result) resultRef.current?.focus()
  }, [result])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = validateFile(file)
    setError(problem)
    setResult(null)
    if (problem || !file) {
      return
    }
    const body = new FormData()
    body.append('file', file)
    setSending(true)
    try {
      const imported = await apiRequest<StatementImport>('/api/imports/', { method: 'POST', body })
      // O resumo abaixo do formulário já é anunciado como alerta, então não há aviso flutuante aqui.
      setResult(imported)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      history.reload()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível importar o extrato.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Importar extrato</h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          Envie o extrato baixado do internet banking. Os lançamentos entram sem categoria, para você classificar
          depois. Importar o mesmo extrato de novo não duplica nada.
        </p>
      </div>

      <section aria-labelledby="titulo-formatos" className="flex flex-col gap-3">
        <h2 id="titulo-formatos" className="text-xl font-semibold">
          Formatos aceitos
        </h2>
        <ul className="flex max-w-prose list-disc flex-col gap-2 pl-6 text-base">
          <li>
            <strong>OFX</strong> (recomendado): procure no banco a opção de exportar o extrato em "OFX" ou "Money".
          </li>
          <li>
            <strong>CSV</strong>: planilha com as colunas <strong>data</strong>, <strong>descrição</strong> e{' '}
            <strong>valor</strong>. Use valores negativos para pagamentos, por exemplo -189,90.
          </li>
        </ul>
        <div>
          <Button asChild variant="outline">
            <a href="/modelo-extrato.csv" download>
              <Download aria-hidden />
              Baixar modelo de CSV
            </a>
          </Button>
        </div>
      </section>

      <section aria-labelledby="titulo-enviar" className="flex flex-col gap-4">
        <h2 id="titulo-enviar" className="text-xl font-semibold">
          Enviar arquivo
        </h2>
        <form onSubmit={handleSubmit} noValidate className="flex max-w-xl flex-col gap-4 rounded-lg border p-4">
          {error && (
            <Alert variant="destructive" ref={errorRef} tabIndex={-1} id="import-erro">
              <AlertDescription className="text-base">{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="statement-file">Arquivo do extrato (.ofx ou .csv, até 2 MB)</Label>
            <input
              ref={inputRef}
              id="statement-file"
              type="file"
              accept=".ofx,.csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null)
                setError('')
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'import-erro' : undefined}
              className="min-h-11 rounded-lg border border-input p-2 text-base file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:text-base file:font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            />
          </div>
          <div>
            <Button type="submit" disabled={sending}>
              <FileUp aria-hidden />
              {sending ? 'Importando…' : 'Importar'}
            </Button>
          </div>
        </form>

        {result && (
          <Alert ref={resultRef} tabIndex={-1} className="max-w-xl">
            <AlertTitle className="text-lg">Importação concluída: {result.file_name}</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 text-base">
              <ul className="list-disc pl-6">
                <li>{plural(result.created_count, 'lançamento criado', 'lançamentos criados')}</li>
                <li>{plural(result.duplicate_count, 'duplicado ignorado', 'duplicados ignorados')}</li>
                {result.ignored_count > 0 && (
                  <li>{plural(result.ignored_count, 'linha sem valor ignorada', 'linhas sem valor ignoradas')}</li>
                )}
              </ul>
              {result.created_count > 0 && (
                <Button asChild className="w-fit">
                  <Link to="/lancamentos?category=none">
                    <ListChecks aria-hidden />
                    Classificar lançamentos sem categoria
                  </Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
      </section>

      <section aria-labelledby="titulo-historico" className="flex flex-col gap-3">
        <h2 id="titulo-historico" className="text-xl font-semibold">
          Histórico de importações
        </h2>
        {history.error && (
          <Alert variant="destructive">
            <AlertDescription className="text-base">{history.error}</AlertDescription>
          </Alert>
        )}
        {!history.data && history.loading && <p role="status">Carregando histórico…</p>}
        {history.data && (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead className="hidden md:table-cell">Importado por</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
                  <TableHead className="text-right">Criados</TableHead>
                  <TableHead className="text-right">Duplicados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data.results.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      Nenhum extrato importado ainda.
                    </TableCell>
                  </TableRow>
                )}
                {history.data.results.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-normal">
                      {item.file_name}
                      <span className="mt-1 block text-sm text-muted-foreground sm:hidden">
                        {formatDateTime(item.imported_at)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{item.imported_by_name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDateTime(item.imported_at)}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.created_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.duplicate_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
