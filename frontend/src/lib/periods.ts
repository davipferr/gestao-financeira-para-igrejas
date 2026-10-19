export type PeriodPreset = 'this-month' | 'last-month' | 'this-year' | 'last-12-months' | 'custom'

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  'this-month': 'Este mês',
  'last-month': 'Mês anterior',
  'this-year': 'Este ano',
  'last-12-months': 'Últimos 12 meses',
  custom: 'Personalizado',
}

export type Period = { date_from: string; date_to: string }

function iso(year: number, monthIndex: number, day: number) {
  // Date resolve meses fora do intervalo (ex.: -1 vira dezembro do ano anterior)
  // e o dia 0 vira o último dia do mês anterior.
  const date = new Date(year, monthIndex, day)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`
}

export function presetPeriod(preset: Exclude<PeriodPreset, 'custom'>, today = new Date()): Period {
  const year = today.getFullYear()
  const month = today.getMonth()
  switch (preset) {
    case 'this-month':
      return { date_from: iso(year, month, 1), date_to: iso(year, month + 1, 0) }
    case 'last-month':
      return { date_from: iso(year, month - 1, 1), date_to: iso(year, month, 0) }
    case 'this-year':
      return { date_from: iso(year, 0, 1), date_to: iso(year, 11, 31) }
    case 'last-12-months':
      return { date_from: iso(year, month - 11, 1), date_to: iso(year, month + 1, 0) }
  }
}

const monthLong = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })

/** "2026-09" vira "setembro de 2026" (ou "Setembro de 2026", para início de frase). */
export function formatMonthLong(month: string, { capitalize = false } = {}) {
  const [year, monthNumber] = month.split('-').map(Number)
  const text = monthLong.format(new Date(year, monthNumber - 1, 1))
  return capitalize ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

/** "2026-09" vira "set. de 26", usado nos rótulos do gráfico. */
export function formatMonthShort(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return monthShort.format(new Date(year, monthNumber - 1, 1))
}
