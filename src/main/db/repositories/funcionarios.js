import { createCrudRepository } from './crud'

const base = createCrudRepository(
  'funcionarios',
  ['nome', 'cpf', 'cargo', 'telefone', 'salario', 'ativo'],
  ['nome', 'cpf', 'cargo']
)
const normalize = (d) => ({ ...d, ativo: d.ativo ? 1 : 0, salario: Number(d.salario) || 0 })

export const funcionariosRepository = {
  ...base,
  create: (d) => base.create(normalize(d)),
  update: (id, d) => base.update(id, normalize(d))
}
