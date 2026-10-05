import { createCrudRepository } from './crud'

export const produtosRepository = createCrudRepository(
  'produtos',
  ['descricao', 'tipo', 'preco_custo', 'preco_venda', 'estoque'],
  ['descricao'],
  'descricao ASC'
)
