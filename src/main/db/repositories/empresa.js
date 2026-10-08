import { getDb } from '../database'

const fields = ['nome', 'documento', 'telefone', 'email', 'endereco']

export const empresaRepository = {
  get() {
    return getDb()
      .prepare('SELECT nome, documento, telefone, email, endereco FROM empresa WHERE id = 1')
      .get()
  },
  save(data) {
    const db = getDb()
    db.prepare(
      `UPDATE empresa SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = 1`
    ).run(...fields.map((field) => String(data[field] ?? '').trim()))
    return this.get()
  }
}
