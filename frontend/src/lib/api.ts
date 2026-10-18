const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'O item procurado não foi encontrado.',
  429: 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.',
}

export type FieldErrors = Record<string, string[]>

export class ApiError extends Error {
  status: number
  fieldErrors: FieldErrors

  constructor(message: string, status: number, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function getCookie(name: string) {
  const match = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : undefined
}

async function csrfToken() {
  // O Django só aceita POST, PATCH e DELETE com o token CSRF. Se o cookie ainda
  // não existe (primeiro acesso), pedimos um antes de enviar a requisição.
  if (!getCookie('csrftoken')) {
    await fetch('/api/auth/csrf/', { credentials: 'same-origin' })
  }
  return getCookie('csrftoken') ?? ''
}

function errorFromBody(status: number, body: unknown): ApiError {
  if (body && typeof body === 'object') {
    const data = body as Record<string, unknown>
    if (typeof data.detail === 'string') {
      return new ApiError(data.detail, status)
    }
    const fieldErrors: FieldErrors = {}
    for (const [field, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        fieldErrors[field] = value.map(String)
      }
    }
    const first = fieldErrors.non_field_errors?.[0] ?? Object.values(fieldErrors)[0]?.[0]
    if (first) {
      return new ApiError(first, status, fieldErrors)
    }
  }
  const message =
    STATUS_MESSAGES[status] ??
    (status >= 500 ? 'O servidor encontrou um erro. Tente novamente em instantes.' : 'Não foi possível concluir a operação.')
  return new ApiError(message, status)
}

type RequestOptions = {
  method?: string
  body?: unknown
}

export async function apiRequest<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json'
  }
  if (UNSAFE_METHODS.includes(method)) {
    headers['X-CSRFToken'] = await csrfToken()
  }

  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.', 0)
  }

  if (response.status === 204) {
    return undefined as T
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw errorFromBody(response.status, data)
  }
  return data as T
}
