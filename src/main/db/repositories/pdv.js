import { getDb } from '../database'

export const pdvRepository = {
  finalizarVenda({ itens = [], desconto = 0, forma_pagamento, cliente_id, funcionario_id }) {
    if (!itens.length) throw new Error('O carrinho está vazio')
    const db = getDb()
    const tx = db.transaction(() => {
      let subtotal = 0
      const linhas = itens.map((i) => {
        const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(i.produto_id)
        if (!produto) throw new Error('Produto não encontrado')
        if (produto.tipo !== 'peca') throw new Error('O PDV permite vender apenas peças')
        const quantidade = Number(i.quantidade) || 0
        if (quantidade <= 0) throw new Error(`Quantidade inválida para ${produto.descricao}`)
        const baixa = db
          .prepare('UPDATE produtos SET estoque = estoque - ? WHERE id = ? AND estoque >= ?')
          .run(quantidade, produto.id, quantidade)
        if (baixa.changes === 0) {
          throw new Error(`Estoque insuficiente para ${produto.descricao}`)
        }
        const valor_unitario = Number(i.valor_unitario ?? produto.preco_venda) || 0
        const valor_total = Math.round(quantidade * valor_unitario * 100) / 100
        subtotal += valor_total
        return { produto, quantidade, valor_unitario, valor_total }
      })
      const desc = Number(desconto) || 0
      const total = Math.max(0, Math.round((subtotal - desc) * 100) / 100)
      const venda = db
        .prepare(
          `INSERT INTO vendas_pdv (data, cliente_id, funcionario_id, forma_pagamento, desconto, total)
           VALUES (datetime('now', 'localtime'), ?, ?, ?, ?, ?)`
        )
        .run(cliente_id ?? null, funcionario_id ?? null, forma_pagamento, desc, total)
      const ins = db.prepare(
        `INSERT INTO venda_itens (venda_id, produto_id, descricao, quantidade, valor_unitario, valor_total)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      for (const l of linhas) {
        ins.run(
          venda.lastInsertRowid,
          l.produto.id,
          l.produto.descricao,
          l.quantidade,
          l.valor_unitario,
          l.valor_total
        )
      }
      return { id: venda.lastInsertRowid, total }
    })
    return tx()
  },
  listVendas() {
    return getDb().prepare('SELECT * FROM vendas_pdv ORDER BY id DESC LIMIT 100').all()
  }
}
