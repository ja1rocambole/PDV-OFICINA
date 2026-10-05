import { getDb } from '../database'
import { createCrudRepository } from './crud'

const base = createCrudRepository(
  'veiculos',
  ['cliente_id', 'placa', 'marca', 'modelo', 'ano', 'cor', 'km', 'observacoes'],
  []
)

const SELECT = `SELECT v.*, c.nome AS cliente_nome FROM veiculos v
  LEFT JOIN clientes c ON c.id = v.cliente_id`

const normalize = (d) => ({
  ...d,
  placa: String(d.placa ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
})

export const veiculosRepository = {
  ...base,
  list(search) {
    const term = (search ?? '').toString().trim()
    if (!term) return getDb().prepare(`${SELECT} ORDER BY v.id DESC`).all()
    const like = `%${term}%`
    return getDb()
      .prepare(
        `${SELECT} WHERE v.placa LIKE ? OR v.modelo LIKE ? OR v.marca LIKE ? OR c.nome LIKE ? ORDER BY v.id DESC`
      )
      .all(like, like, like, like)
  },
  create: (d) => base.create(normalize(d)),
  update: (id, d) => base.update(id, normalize(d))
}
