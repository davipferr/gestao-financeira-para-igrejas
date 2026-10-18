import { describe, expect, it } from 'vitest'

import { ApiError, apiRequest } from '@/lib/api'
import { mockFetch } from '@/test/fetchMock'

describe('apiRequest', () => {
  it('envia o token CSRF nas requisições que alteram dados', async () => {
    document.cookie = 'csrftoken=token-de-teste'
    const fetchMock = mockFetch({ 'POST /api/auth/logout/': { status: 204 } })

    await apiRequest('/api/auth/logout/', { method: 'POST' })

    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>
    expect(headers['X-CSRFToken']).toBe('token-de-teste')
  })

  it('pede o cookie CSRF antes, quando ele ainda não existe', async () => {
    const fetchMock = mockFetch({
      'GET /api/auth/csrf/': { status: 204 },
      'POST /api/auth/logout/': { status: 204 },
    })

    await apiRequest('/api/auth/logout/', { method: 'POST' })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/csrf/')
  })

  it('usa a mensagem "detail" enviada pelo servidor', async () => {
    mockFetch({ 'GET /api/access-logs/': { status: 403, body: { detail: 'Apenas administradores podem realizar esta ação.' } } })

    await expect(apiRequest('/api/access-logs/')).rejects.toThrow('Apenas administradores podem realizar esta ação.')
  })

  it('guarda os erros por campo e usa o primeiro como mensagem', async () => {
    mockFetch({
      'POST /api/transactions/': { status: 400, body: { amount: ['O valor deve ser maior que zero.'] } },
    })
    document.cookie = 'csrftoken=x'

    const error = (await apiRequest('/api/transactions/', { method: 'POST', body: {} }).catch((caught) => caught)) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toBe('O valor deve ser maior que zero.')
    expect(error.fieldErrors.amount).toEqual(['O valor deve ser maior que zero.'])
  })

  it('traduz erros sem corpo pelo código HTTP', async () => {
    mockFetch({ 'GET /api/health/': { status: 500, body: null } })

    await expect(apiRequest('/api/health/')).rejects.toThrow('O servidor encontrou um erro. Tente novamente em instantes.')
  })
})
