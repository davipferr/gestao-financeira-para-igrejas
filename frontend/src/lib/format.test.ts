import { describe, expect, it } from 'vitest'

import { formatDate, formatMoney, parseMoneyInput, toMoneyInput } from '@/lib/format'

describe('formatação', () => {
  it('formata valores em reais', () => {
    expect(formatMoney('1234.5')).toBe('R$ 1.234,50')
  })

  it('converte valores digitados no formato brasileiro', () => {
    expect(parseMoneyInput('1.234,56')).toBe('1234.56')
    expect(parseMoneyInput('R$ 25,5')).toBe('25.50')
    expect(parseMoneyInput('300')).toBe('300.00')
    expect(parseMoneyInput('1234,5')).toBe('1234.50')
  })

  it('recusa valores inválidos', () => {
    expect(parseMoneyInput('')).toBeNull()
    expect(parseMoneyInput('abc')).toBeNull()
    expect(parseMoneyInput('12,345')).toBeNull()
    expect(parseMoneyInput('-10')).toBeNull()
  })

  it('prepara o valor da API para edição', () => {
    expect(toMoneyInput('1234.50')).toBe('1234,50')
  })

  it('mostra datas no formato dia/mês/ano', () => {
    expect(formatDate('2026-09-07')).toBe('07/09/2026')
  })
})
