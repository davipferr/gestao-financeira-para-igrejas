import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from '@/App'
import { formatDateTime } from '@/lib/format'
import { ADMIN, MEMBER } from '@/test/fixtures'
import { mockFetch } from '@/test/fetchMock'

const LOG = { id: 1, username: 'maria', full_name: 'Maria Souza', accessed_at: '2026-10-18T19:42:00-03:00' }

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Registro de acessos', () => {
  it('lista quem acessou, com data e horário', async () => {
    mockFetch({
      'GET /api/auth/me/': { body: ADMIN },
      'GET /api/access-logs/?page=1': { body: { count: 1, next: null, previous: null, results: [LOG] } },
    })

    renderAt('/acessos')

    const row = (await screen.findByText('Maria Souza')).closest('tr')!
    expect(row).toHaveTextContent('maria')
    expect(row).toHaveTextContent(formatDateTime(LOG.accessed_at))
    expect(screen.getByRole('status')).toHaveTextContent('1 acesso registrado.')
  })

  it('pagina quando há muitos acessos', async () => {
    const many = Array.from({ length: 20 }, (_, index) => ({ ...LOG, id: index + 1 }))
    const fetchMock = mockFetch({
      'GET /api/auth/me/': { body: ADMIN },
      'GET /api/access-logs/?page=1': { body: { count: 25, next: 'x', previous: null, results: many } },
      'GET /api/access-logs/?page=2': { body: { count: 25, next: null, previous: 'x', results: [LOG] } },
    })
    const user = userEvent.setup()
    renderAt('/acessos')

    await screen.findByText('Página 1 de 2')
    await user.click(screen.getByRole('button', { name: 'Próxima' }))

    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/access-logs/?page=2', expect.anything())
  })

  it('bloqueia a página para membros', async () => {
    mockFetch({ 'GET /api/auth/me/': { body: MEMBER } })

    renderAt('/acessos')

    expect(await screen.findByRole('heading', { name: 'Acesso restrito' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Acessos' })).not.toBeInTheDocument()
  })
})
