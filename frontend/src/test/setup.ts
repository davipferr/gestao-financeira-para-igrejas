import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// O jsdom não implementa matchMedia, que a biblioteca de avisos (sonner) usa.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

// A partir do Node 25 existe um localStorage experimental do próprio Node que, sem
// configuração extra, não funciona e esconde o do jsdom. Nos testes usamos um em memória.
if (typeof globalThis.localStorage?.clear !== 'function') {
  const items = new Map<string, string>()
  const memoryStorage: Storage = {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  }
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true })
}

// O jsdom também não tem ResizeObserver, usado pelos gráficos (recharts).
window.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  localStorage.clear()
  document.documentElement.removeAttribute('style')
  document.documentElement.classList.remove('alto-contraste')
})
