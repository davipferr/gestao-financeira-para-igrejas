import { useCallback, useEffect, useState } from 'react'

import { ApiError, apiRequest } from '@/lib/api'

type Result<T> = { key: string; data?: T; error?: string }

/**
 * Carrega um recurso da API sempre que o caminho muda.
 *
 * Se o caminho mudar antes da resposta chegar (por exemplo, ao trocar de página
 * rápido), a resposta antiga é descartada para não sobrescrever a nova.
 * Enquanto carrega, os dados anteriores continuam visíveis.
 */
export function useApiResource<T>(path: string, fallbackError: string) {
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState<Result<T> | null>(null)
  const key = `${path}#${reloadCount}`

  useEffect(() => {
    let current = true
    apiRequest<T>(path)
      .then((data) => current && setResult({ key, data }))
      .catch((error: unknown) =>
        current && setResult({ key, error: error instanceof ApiError ? error.message : fallbackError }),
      )
    return () => {
      current = false
    }
  }, [path, key, fallbackError])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  return {
    data: result?.data,
    error: result?.key === key ? result.error : undefined,
    loading: result?.key !== key,
    reload,
  }
}
