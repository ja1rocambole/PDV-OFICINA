import { createCrudRepository } from './crud'

export const clientesRepository = createCrudRepository(
  'clientes',
  ['nome', 'cpf', 'telefone', 'email', 'endereco'],
  ['nome', 'cpf']
)
