import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from '@/App'
import { mockFetch } from '@/test/fetchMock'

const NOT_LOGGED = { status: 403, body: { detail: 'As credenciais de autenticação não foram fornecidas.' } }
const MARIA = { id: 2, username: 'maria', full_name: 'Maria Souza', role: 'member', role_display: 'Membro' }

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Tela de login', () => {
  it('leva para o login quem não está autenticado', async () => {
    mockFetch({ 'GET /api/auth/me/': NOT_LOGGED })

    renderAt('/')

    expect(await screen.findByRole('heading', { name: 'Gestão Financeira para Igrejas' })).toBeInTheDocument()
    expect(screen.getByLabelText('Usuário')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password')
  })

  it('entra no sistema e mostra o nome e o perfil do usuário', async () => {
    document.cookie = 'csrftoken=x'
    mockFetch({
      'GET /api/auth/me/': NOT_LOGGED,
      'POST /api/auth/login/': { body: MARIA },
    })
    const user = userEvent.setup()
    renderAt('/login')

    await user.type(await screen.findByLabelText('Usuário'), 'maria')
    await user.type(screen.getByLabelText('Senha'), 'senha-correta')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: 'Olá, Maria Souza!' })).toBeInTheDocument()
    expect(screen.getByText('(Membro)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toBeInTheDocument()
  })

  it('mostra o erro do servidor como alerta e mantém o usuário na tela', async () => {
    document.cookie = 'csrftoken=x'
    mockFetch({
      'GET /api/auth/me/': NOT_LOGGED,
      'POST /api/auth/login/': { status: 400, body: { non_field_errors: ['Usuário ou senha inválidos.'] } },
    })
    const user = userEvent.setup()
    renderAt('/login')

    await user.type(await screen.findByLabelText('Usuário'), 'maria')
    await user.type(screen.getByLabelText('Senha'), 'errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Usuário ou senha inválidos.')
    expect(alert).toHaveFocus()
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true')
  })

  it('avisa quando os campos estão vazios sem chamar o servidor', async () => {
    const fetchMock = mockFetch({ 'GET /api/auth/me/': NOT_LOGGED })
    const user = userEvent.setup()
    renderAt('/login')

    await user.click(await screen.findByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Preencha o usuário e a senha para entrar.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('permite mostrar e ocultar a senha', async () => {
    mockFetch({ 'GET /api/auth/me/': NOT_LOGGED })
    const user = userEvent.setup()
    renderAt('/login')

    const toggle = await screen.findByRole('button', { name: 'Mostrar senha' })
    await user.click(toggle)

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true')
  })
})
