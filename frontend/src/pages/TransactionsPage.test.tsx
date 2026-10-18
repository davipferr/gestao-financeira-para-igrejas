import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import App from '@/App'
import { ADMIN, CATEGORIES, MEMBER, page, transaction } from '@/test/fixtures'
import { mockFetch } from '@/test/fetchMock'

const LIST = page([
  transaction(),
  transaction({
    id: 11,
    date: '2026-09-10',
    description: 'CONTA DE ÁGUA SAAE',
    amount: '89.90',
    kind: 'expense',
    kind_display: 'Pagamento',
    category: null,
    category_name: null,
    imported: true,
  }),
])

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

function baseRoutes() {
  return {
    'GET /api/auth/me/': { body: ADMIN },
    'GET /api/categories/': { body: CATEGORIES },
  }
}

describe('Página de lançamentos', () => {
  beforeEach(() => {
    document.cookie = 'csrftoken=x'
  })

  it('mostra data, valor com sinal e lançamentos importados sem categoria', async () => {
    mockFetch({ ...baseRoutes(), 'GET /api/transactions/?page=1': { body: LIST } })

    renderAt('/lancamentos')

    const income = (await screen.findByText('Dízimos do culto de domingo')).closest('tr')!
    expect(income).toHaveTextContent('07/09/2026')
    expect(income).toHaveTextContent('+ R$ 1.250,40')
    const expense = screen.getByText('CONTA DE ÁGUA SAAE').closest('tr')!
    expect(expense).toHaveTextContent('− R$ 89,90')
    expect(within(expense).getByText('Importado')).toBeInTheDocument()
    expect(within(expense).getAllByText('Sem categoria').length).toBeGreaterThan(0)
    expect(screen.getByRole('status')).toHaveTextContent('2 lançamentos encontrados.')
  })

  it('envia os filtros escolhidos para a API', async () => {
    const fetchMock = mockFetch({
      ...baseRoutes(),
      'GET /api/transactions/?page=1': { body: LIST },
      'GET /api/transactions/?page=1&date_from=2026-09-01&kind=expense&category=none': { body: page([]) },
    })
    const user = userEvent.setup()
    renderAt('/lancamentos')

    await screen.findByText('Dízimos do culto de domingo')
    await user.type(screen.getByLabelText('De'), '2026-09-01')
    await user.selectOptions(screen.getByLabelText('Tipo'), 'expense')
    await user.selectOptions(screen.getByLabelText('Categoria'), 'none')
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(await screen.findByText('Nenhum lançamento encontrado.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/transactions/?page=1&date_from=2026-09-01&kind=expense&category=none',
      expect.anything(),
    )
  })

  it('cadastra um lançamento convertendo o valor brasileiro', async () => {
    const fetchMock = mockFetch({
      ...baseRoutes(),
      'GET /api/transactions/?page=1': [{ body: LIST }, { body: LIST }],
      'POST /api/transactions/': { status: 201, body: transaction({ id: 12 }) },
    })
    const user = userEvent.setup()
    renderAt('/lancamentos')

    await user.click(await screen.findByRole('button', { name: 'Novo lançamento' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo lançamento' })
    const category = within(dialog).getByLabelText('Categoria')
    expect(within(category).queryByRole('option', { name: 'Água' })).not.toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText('Data'))
    await user.type(within(dialog).getByLabelText('Data'), '2026-09-14')
    await user.type(within(dialog).getByLabelText('Valor (R$)'), '1.234,56')
    await user.type(within(dialog).getByLabelText('Descrição'), 'Oferta missionária')
    await user.selectOptions(category, 'Ofertas')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Lançamento salvo.')).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      date: '2026-09-14',
      description: 'Oferta missionária',
      amount: '1234.56',
      kind: 'income',
      category: 2,
    })
  })

  it('aponta o valor inválido sem enviar ao servidor', async () => {
    const fetchMock = mockFetch({ ...baseRoutes(), 'GET /api/transactions/?page=1': { body: LIST } })
    const user = userEvent.setup()
    renderAt('/lancamentos')

    await user.click(await screen.findByRole('button', { name: 'Novo lançamento' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo lançamento' })
    await user.type(within(dialog).getByLabelText('Valor (R$)'), 'dez reais')
    await user.type(within(dialog).getByLabelText('Descrição'), 'Oferta')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    const amount = within(dialog).getByLabelText('Valor (R$)')
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    expect(amount).toHaveAccessibleDescription('Informe um valor válido, por exemplo 1.250,00.')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  it('exclui somente depois da confirmação', async () => {
    const fetchMock = mockFetch({
      ...baseRoutes(),
      'GET /api/transactions/?page=1': [{ body: LIST }, { body: page([LIST.results[1]]) }],
      'DELETE /api/transactions/10/': { status: 204 },
    })
    const user = userEvent.setup()
    renderAt('/lancamentos')

    await user.click(await screen.findByRole('button', { name: 'Excluir Dízimos do culto de domingo' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Excluir lançamento?' })
    expect(dialog).toHaveTextContent('R$ 1.250,40 em 07/09/2026')
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByText('Lançamento excluído.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/transactions/10/', expect.objectContaining({ method: 'DELETE' }))
  })

  it('bloqueia a página para membros', async () => {
    mockFetch({ 'GET /api/auth/me/': { body: MEMBER } })

    renderAt('/lancamentos')

    expect(await screen.findByRole('heading', { name: 'Acesso restrito' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Lançamentos' })).not.toBeInTheDocument()
  })
})
