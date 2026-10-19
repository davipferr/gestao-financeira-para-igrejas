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

export type StatementImport = {
  id: number
  file_name: string
  file_format: 'ofx' | 'csv'
  imported_by_name: string
  imported_at: string
  created_count: number
  duplicate_count: number
  ignored_count: number
}

export type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type DreCategory = {
  id: number | null
  name: string
  total: string
}

export type DreMonth = {
  month: string
  income: string
  expense: string
  result: string
}

export type DreReport = {
  period: { date_from: string; date_to: string }
  income: { total: string; categories: DreCategory[] }
  expense: { total: string; categories: DreCategory[] }
  result: string
  result_label: 'Superávit' | 'Déficit'
  monthly: DreMonth[]
}

export type AccessLog = {
  id: number
  username: string
  full_name: string
  accessed_at: string
}
