import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import App from '@/App'
import { ADMIN, CATEGORIES, MEMBER } from '@/test/fixtures'
import { mockFetch } from '@/test/fetchMock'

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Página de categorias', () => {
  beforeEach(() => {
    document.cookie = 'csrftoken=x'
  })

  it('separa as categorias em rendimentos e pagamentos', async () => {
    mockFetch({ 'GET /api/auth/me/': { body: ADMIN }, 'GET /api/categories/': { body: CATEGORIES } })

    renderAt('/categorias')

    const income = await screen.findByRole('region', { name: 'Rendimentos' })
    const expense = screen.getByRole('region', { name: 'Pagamentos' })
    expect(within(income).getByText('Dízimos')).toBeInTheDocument()
    expect(within(expense).getByText('Água')).toBeInTheDocument()
    expect(within(expense).getAllByText('Inativa').length).toBeGreaterThan(0)
  })

  it('cria uma categoria e avisa que deu certo', async () => {
    const created = { id: 9, name: 'Cantina', kind: 'income', kind_display: 'Rendimento', is_active: true }
    const fetchMock = mockFetch({
      'GET /api/auth/me/': { body: ADMIN },
      'GET /api/categories/': [{ body: CATEGORIES }, { body: [...CATEGORIES, created] }],
      'POST /api/categories/': { status: 201, body: created },
    })
    const user = userEvent.setup()
    renderAt('/categorias')

    await user.click(await screen.findByRole('button', { name: 'Nova categoria de rendimento' }))
    await user.type(screen.getByLabelText('Nome'), 'Cantina')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Categoria "Cantina" criada.')).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ name: 'Cantina', kind: 'income' })
    expect(await screen.findByText('Cantina')).toBeInTheDocument()
  })

  it('não deixa mudar o tipo ao editar', async () => {
    mockFetch({ 'GET /api/auth/me/': { body: ADMIN }, 'GET /api/categories/': { body: CATEGORIES } })
    const user = userEvent.setup()
    renderAt('/categorias')

    await user.click(await screen.findByRole('button', { name: 'Editar Dízimos' }))

    expect(screen.getByLabelText('Nome')).toHaveValue('Dízimos')
    expect(screen.getByRole('radio', { name: 'Pagamento' })).toBeDisabled()
    expect(screen.getByText('O tipo não pode ser alterado depois de criada a categoria.')).toBeInTheDocument()
  })

  it('pede confirmação e mostra o motivo quando a exclusão é recusada', async () => {
    const fetchMock = mockFetch({
      'GET /api/auth/me/': { body: ADMIN },
      'GET /api/categories/': { body: CATEGORIES },
      'DELETE /api/categories/1/': {
        status: 400,
        body: { detail: 'Esta categoria já possui lançamentos e não pode ser excluída. Desative-a em vez de excluir.' },
      },
    })
    const user = userEvent.setup()
    renderAt('/categorias')

    await user.click(await screen.findByRole('button', { name: 'Excluir Dízimos' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Excluir categoria?' })
    expect(fetchMock).not.toHaveBeenCalledWith('/api/categories/1/', expect.anything())
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByText(/Desative-a em vez de excluir/)).toBeInTheDocument()
  })

  it('não mostra o menu nem a página para membros', async () => {
    mockFetch({ 'GET /api/auth/me/': { body: MEMBER } })

    renderAt('/categorias')

    expect(await screen.findByRole('heading', { name: 'Acesso restrito' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Categorias' })).not.toBeInTheDocument()
  })
})
