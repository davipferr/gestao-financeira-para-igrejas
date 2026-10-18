import type { Category, Transaction } from '@/lib/types'

export const ADMIN = { id: 1, username: 'contador', full_name: 'Carlos Contador', role: 'admin', role_display: 'Administrador' }
export const MEMBER = { id: 2, username: 'maria', full_name: 'Maria Souza', role: 'member', role_display: 'Membro' }

export const CATEGORIES: Category[] = [
  { id: 1, name: 'Dízimos', kind: 'income', kind_display: 'Rendimento', is_active: true },
  { id: 2, name: 'Ofertas', kind: 'income', kind_display: 'Rendimento', is_active: true },
  { id: 3, name: 'Água', kind: 'expense', kind_display: 'Pagamento', is_active: true },
  { id: 4, name: 'Aluguel', kind: 'expense', kind_display: 'Pagamento', is_active: false },
]

export function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 10,
    date: '2026-09-07',
    description: 'Dízimos do culto de domingo',
    amount: '1250.40',
    kind: 'income',
    kind_display: 'Rendimento',
    category: 1,
    category_name: 'Dízimos',
    created_by_name: 'Carlos Contador',
    imported: false,
    created_at: '2026-09-07T10:00:00-03:00',
    updated_at: '2026-09-07T10:00:00-03:00',
    ...overrides,
  }
}

export function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}
