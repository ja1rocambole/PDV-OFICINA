const digits = (v) => String(v ?? '').replace(/\D/g, '')

export const validateCpf = (_, value) => {
  if (!value) return Promise.resolve()
  const d = digits(value)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return Promise.reject(new Error('CPF inválido'))
  const check = (len) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  if (check(9) !== Number(d[9]) || check(10) !== Number(d[10])) {
    return Promise.reject(new Error('CPF inválido'))
  }
  return Promise.resolve()
}

export const validateTelefone = (_, value) => {
  if (!value) return Promise.resolve()
  const len = digits(value).length
  return len === 10 || len === 11
    ? Promise.resolve()
    : Promise.reject(new Error('Telefone inválido (use DDD + número)'))
}

export const validatePlaca = (_, value) => {
  if (!value) return Promise.resolve()
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(
    String(value)
      .toUpperCase()
      .replace(/[^A-Za-z0-9]/g, '')
  )
    ? Promise.resolve()
    : Promise.reject(new Error('Placa inválida (ABC1D23 ou ABC1234)'))
}
