import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from '@/App'
import { presetPeriod } from '@/lib/periods'
import type { DreReport } from '@/lib/types'
import { ADMIN, MEMBER } from '@/test/fixtures'
import { mockFetch } from '@/test/fetchMock'

const REPORT: DreReport = {
  period: { date_from: '2026-09-01', date_to: '2026-09-30' },
  income: {
    total: '1000.00',
    categories: [
      { id: 1, name: 'Dízimos', total: '750.00' },
      { id: null, name: 'Sem categoria', total: '250.00' },
    ],
  },
  expense: { total: '1200.50', categories: [{ id: 3, name: 'Água', total: '1200.50' }] },
  result: '-200.50',
  result_label: 'Déficit',
  monthly: [{ month: '2026-09', income: '1000.00', expense: '1200.50', result: '-200.50' }],
}

function dreKey(preset: Parameters<typeof presetPeriod>[0]) {
  const { date_from, date_to } = presetPeriod(preset)
  return `GET /api/reports/dre/?date_from=${date_from}&date_to=${date_to}`
}

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Prestação de contas', () => {
  it('mostra totais, resultado em palavras e a divisão por categoria', async () => {
    mockFetch({ 'GET /api/auth/me/': { body: MEMBER }, [dreKey('this-month')]: { body: REPORT } })

    renderAt('/prestacao-de-contas')

    expect(await screen.findByText('Resultado: Déficit')).toBeInTheDocument()
    expect(screen.getByText('− R$ 200,50')).toBeInTheDocument()
    expect(screen.getByText('Saiu mais do que entrou')).toBeInTheDocument()

    const income = screen.getByRole('region', { name: 'Rendimentos por categoria' })
    const tithes = within(income).getByText('Dízimos').closest('tr')!
    expect(tithes).toHaveTextContent('R$ 750,00')
    expect(tithes).toHaveTextContent('75%')
    expect(within(income).getByText('Sem categoria')).toBeInTheDocument()
  })

  it('oferece os valores do gráfico em tabela', async () => {
    mockFetch({ 'GET /api/auth/me/': { body: MEMBER }, [dreKey('this-month')]: { body: REPORT } })

    renderAt('/prestacao-de-contas')

    const figure = await screen.findByRole('figure', { name: 'Rendimentos e pagamentos mês a mês' })
    const row = (await within(figure).findByText('Setembro de 2026')).closest('tr')!
    expect(row).toHaveTextContent('R$ 1.000,00')
    expect(row).toHaveTextContent('R$ 1.200,50')
    expect(row).toHaveTextContent('− R$ 200,50')
  })

  it('busca o relatório do período escolhido', async () => {
    const fetchMock = mockFetch({
      'GET /api/auth/me/': { body: MEMBER },
      [dreKey('this-month')]: { body: REPORT },
      [dreKey('last-12-months')]: { body: REPORT },
    })
    const user = userEvent.setup()
    renderAt('/prestacao-de-contas')

    await screen.findByText('Resultado: Déficit')
    await user.selectOptions(screen.getByLabelText('Período'), 'Últimos 12 meses')

    const { date_from } = presetPeriod('last-12-months')
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`date_from=${date_from}`), expect.anything())
  })

  it('valida o período personalizado', async () => {
    mockFetch({ 'GET /api/auth/me/': { body: MEMBER }, [dreKey('this-month')]: { body: REPORT } })
    const user = userEvent.setup()
    renderAt('/prestacao-de-contas')

    await screen.findByText('Resultado: Déficit')
    await user.selectOptions(screen.getByLabelText('Período'), 'Personalizado')
    await user.clear(screen.getByLabelText('De'))
    await user.type(screen.getByLabelText('De'), '2026-09-30')
    await user.clear(screen.getByLabelText('Até'))
    await user.type(screen.getByLabelText('Até'), '2026-09-01')
    await user.click(screen.getByRole('button', { name: 'Ver período' }))

    expect(screen.getByRole('alert')).toHaveTextContent('A data final não pode ser anterior à data inicial.')
  })

  it('mostra o resumo do mês na página inicial', async () => {
    mockFetch({ 'GET /api/auth/me/': { body: MEMBER }, [dreKey('this-month')]: { body: REPORT } })

    renderAt('/')

    expect(await screen.findByText('Resultado: Déficit')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver prestação de contas completa' })).toHaveAttribute(
      'href',
      '/prestacao-de-contas',
    )
    expect(screen.getByRole('link', { name: 'Prestação de contas' })).toBeInTheDocument()
  })

  it('aparece no menu também para administradores', async () => {
    mockFetch({ 'GET /api/auth/me/': { body: ADMIN }, [dreKey('this-month')]: { body: REPORT } })

    renderAt('/')

    expect(await screen.findByRole('link', { name: 'Prestação de contas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Acessos' })).toBeInTheDocument()
  })
})
