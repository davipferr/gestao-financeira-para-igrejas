const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatMoney(value: string | number) {
  return currency.format(Number(value))
}

/**
 * Converte o valor digitado no formato brasileiro ("1.234,56" ou "R$ 25,5")
 * para o formato da API ("1234.56"). Devolve null quando não é um número válido.
 */
export function parseMoneyInput(text: string) {
  const cleaned = text.replace(/R\$|\s/g, '')
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(cleaned)) {
    return null
  }
  const [integer, cents = ''] = cleaned.replace(/\./g, '').split(',')
  return `${integer}.${cents.padEnd(2, '0')}`
}

/** Mostra um valor da API ("1234.50") como o usuário digitaria ("1234,50"). */
export function toMoneyInput(value: string) {
  return value.replace('.', ',')
}

/** "2026-09-07" vira "07/09/2026", sem passar por Date para não sofrer com fuso horário. */
export function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function formatDateTime(isoDateTime: string) {
  return dateTime.format(new Date(isoDateTime))
}

export function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
