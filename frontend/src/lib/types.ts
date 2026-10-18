export type Kind = 'income' | 'expense'

export const KIND_LABELS: Record<Kind, string> = {
  income: 'Rendimento',
  expense: 'Pagamento',
}

export type Category = {
  id: number
  name: string
  kind: Kind
  kind_display: string
  is_active: boolean
}

export type Transaction = {
  id: number
  date: string
  description: string
  amount: string
  kind: Kind
  kind_display: string
  category: number | null
  category_name: string | null
  created_by_name: string
  imported: boolean
  created_at: string
  updated_at: string
}

export type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
