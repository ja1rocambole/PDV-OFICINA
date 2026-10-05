import dayjs from 'dayjs'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatCurrency = (value) => brl.format(Number(value) || 0)

export const formatDate = (value) => {
  if (!value) return '-'
  const d = dayjs(value)
  return d.isValid() ? d.format('DD/MM/YYYY') : '-'
}

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
