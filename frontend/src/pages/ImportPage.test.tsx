import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import App from '@/App'
import { ADMIN, CATEGORIES, MEMBER, page } from '@/test/fixtures'
import { mockFetch } from '@/test/fetchMock'

const PREVIOUS_IMPORT = {
  id: 1,
  file_name: 'extrato-setembro.ofx',
  file_format: 'ofx',
  imported_by_name: 'Carlos Contador',
  imported_at: '2026-10-01T09:30:00-03:00',
  created_count: 12,
  duplicate_count: 0,
  ignored_count: 0,
}

const NEW_IMPORT = {
  ...PREVIOUS_IMPORT,
  id: 2,
  file_name: 'extrato-outubro.csv',
  file_format: 'csv',
  created_count: 3,
  duplicate_count: 1,
  ignored_count: 1,
}

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

function csvFile(name = 'extrato-outubro.csv', content = 'data;descrição;valor\n05/10/2026;Oferta;10,00\n') {
  return new File([content], name, { type: 'text/csv' })
}

describe('Página de importação de extrato', () => {
  beforeEach(() => {
    document.cookie = 'csrftoken=x'
  })

  it('mostra o histórico e o link para o modelo de CSV', async () => {
    mockFetch({ 'GET /api/auth/me/': { body: ADMIN }, 'GET /api/imports/': { body: page([PREVIOUS_IMPORT]) } })

    renderAt('/importar')

    const history = await screen.findByRole('region', { name: 'Histórico de importações' })
    expect(await within(history).findByText('extrato-setembro.ofx')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Baixar modelo de CSV' })).toHaveAttribute('href', '/modelo-extrato.csv')
  })

  it('envia o arquivo, mostra o resumo e leva aos lançamentos sem categoria', async () => {
    const fetchMock = mockFetch({
      'GET /api/auth/me/': { body: ADMIN },
      'GET /api/imports/': [{ body: page([PREVIOUS_IMPORT]) }, { body: page([NEW_IMPORT, PREVIOUS_IMPORT]) }],
      'POST /api/imports/': { status: 201, body: NEW_IMPORT },
      'GET /api/categories/': { body: CATEGORIES },
      'GET /api/transactions/?page=1&category=none': { body: page([]) },
    })
    const user = userEvent.setup()
    renderAt('/importar')

    await user.upload(await screen.findByLabelText(/Arquivo do extrato/), csvFile())
    await user.click(screen.getByRole('button', { name: 'Importar' }))

    const summary = await screen.findByText('Importação concluída: extrato-outubro.csv')
    const alert = summary.closest('[role="alert"]') as HTMLElement
    expect(alert).toHaveFocus()
    expect(alert).toHaveTextContent('3 lançamentos criados')
    expect(alert).toHaveTextContent('1 duplicado ignorado')
    expect(alert).toHaveTextContent('1 linha sem valor ignorada')

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    const body = post?.[1]?.body as FormData
    expect((body.get('file') as File).name).toBe('extrato-outubro.csv')

    await user.click(within(alert).getByRole('link', { name: 'Classificar lançamentos sem categoria' }))
    expect(await screen.findByRole('heading', { name: 'Lançamentos' })).toBeInTheDocument()
    expect(screen.getByLabelText('Categoria')).toHaveValue('none')
  })

  it('recusa formatos não suportados sem enviar ao servidor', async () => {
    const fetchMock = mockFetch({ 'GET /api/auth/me/': { body: ADMIN }, 'GET /api/imports/': { body: page([]) } })
    const user = userEvent.setup({ applyAccept: false })
    renderAt('/importar')

    await user.upload(await screen.findByLabelText(/Arquivo do extrato/), csvFile('extrato.pdf'))
    await user.click(screen.getByRole('button', { name: 'Importar' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Formato não suportado. Envie um arquivo .ofx ou .csv.')
    expect(alert).toHaveFocus()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  it('pede um arquivo quando nada foi selecionado', async () => {
    mockFetch({ 'GET /api/auth/me/': { body: ADMIN }, 'GET /api/imports/': { body: page([]) } })
    const user = userEvent.setup()
    renderAt('/importar')

    await user.click(await screen.findByRole('button', { name: 'Importar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Selecione o arquivo do extrato (.ofx ou .csv).')
  })

  it('mostra a linha com problema informada pelo servidor', async () => {
    mockFetch({
      'GET /api/auth/me/': { body: ADMIN },
      'GET /api/imports/': { body: page([]) },
      'POST /api/imports/': { status: 400, body: { detail: 'Linha 4 do CSV: valor inválido "trinta".' } },
    })
    const user = userEvent.setup()
    renderAt('/importar')

    await user.upload(await screen.findByLabelText(/Arquivo do extrato/), csvFile())
    await user.click(screen.getByRole('button', { name: 'Importar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Linha 4 do CSV: valor inválido "trinta".')
  })

  it('bloqueia a página para membros', async () => {
    mockFetch({ 'GET /api/auth/me/': { body: MEMBER } })

    renderAt('/importar')

    expect(await screen.findByRole('heading', { name: 'Acesso restrito' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Importar extrato' })).not.toBeInTheDocument()
  })
})
