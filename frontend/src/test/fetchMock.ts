import { vi } from 'vitest'

type MockResponse = { status?: number; body?: unknown }

/**
 * Substitui o fetch do navegador por respostas fixas, escolhidas pelo método e caminho.
 * Exemplo: mockFetch({ 'GET /api/auth/me/': { status: 403, body: {...} } })
 */
export function mockFetch(routes: Record<string, MockResponse | MockResponse[]>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`
    const route = routes[key]
    const response = Array.isArray(route) ? route.shift() : route
    if (!response) {
      throw new Error(`Requisição inesperada no teste: ${key}`)
    }
    const status = response.status ?? 200
    return new Response(status === 204 ? null : JSON.stringify(response.body ?? {}), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
