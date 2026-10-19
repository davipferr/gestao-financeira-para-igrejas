import { describe, expect, it } from 'vitest'

import { formatMonthLong, presetPeriod } from '@/lib/periods'

const TODAY = new Date(2026, 0, 15)

describe('períodos do relatório', () => {
  it('calcula o mês atual e o anterior, inclusive na virada do ano', () => {
    expect(presetPeriod('this-month', TODAY)).toEqual({ date_from: '2026-01-01', date_to: '2026-01-31' })
    expect(presetPeriod('last-month', TODAY)).toEqual({ date_from: '2025-12-01', date_to: '2025-12-31' })
  })

  it('calcula o ano e os últimos 12 meses', () => {
    expect(presetPeriod('this-year', TODAY)).toEqual({ date_from: '2026-01-01', date_to: '2026-12-31' })
    expect(presetPeriod('last-12-months', TODAY)).toEqual({ date_from: '2025-02-01', date_to: '2026-01-31' })
  })

  it('respeita meses de 29 dias', () => {
    expect(presetPeriod('this-month', new Date(2028, 1, 10)).date_to).toBe('2028-02-29')
  })

  it('escreve o mês por extenso', () => {
    expect(formatMonthLong('2026-09')).toBe('setembro de 2026')
  })
})
