import { getDb } from '../database'

const STATUS_FECHADOS = ['concluida', 'entregue']

const SELECT = `SELECT o.*, c.nome AS cliente_nome, v.placa AS veiculo_placa,
  v.modelo AS veiculo_modelo, f.nome AS funcionario_nome
  FROM ordens_servico o
  LEFT JOIN clientes c ON c.id = o.cliente_id
  LEFT JOIN veiculos v ON v.id = o.veiculo_id
  LEFT JOIN funcionarios f ON f.id = o.funcionario_id`

function now() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function calcItens(itens = []) {
  return itens.map((i) => {
    const quantidade = Number(i.quantidade) || 0
    const valor_unitario = Number(i.valor_unitario) || 0
    return {
      produto_id: i.produto_id ?? null,
      descricao: i.descricao ?? '',
      quantidade,
      valor_unitario,
      valor_total: Math.round(quantidade * valor_unitario * 100) / 100
    }
  })
}

function calcTotal(itens, desconto) {
  const sub = itens.reduce((s, i) => s + i.valor_total, 0)
  return Math.max(0, Math.round((sub - (Number(desconto) || 0)) * 100) / 100)
}

function saveItens(os_id, itens) {
  const db = getDb()
  db.prepare('DELETE FROM os_itens WHERE os_id = ?').run(os_id)
  const ins = db.prepare(
    'INSERT INTO os_itens (os_id, produto_id, descricao, quantidade, valor_unitario, valor_total) VALUES (?, ?, ?, ?, ?, ?)'
  )
  for (const i of itens) {
    ins.run(os_id, i.produto_id, i.descricao, i.quantidade, i.valor_unitario, i.valor_total)
  }
}

export const ordensServicoRepository = {
  list({ status, search } = {}) {
    const where = []
    const params = []
    if (status) {
      where.push('o.status = ?')
      params.push(status)
    }
    const term = (search ?? '').toString().trim()
    if (term) {
      where.push('(CAST(o.numero AS TEXT) LIKE ? OR c.nome LIKE ?)')
      params.push(`%${term}%`, `%${term}%`)
    }
    const clause = where.length ? ` WHERE ${where.join(' AND ')}` : ''
    return getDb()
      .prepare(`${SELECT}${clause} ORDER BY o.numero DESC`)
      .all(...params)
  },
  get(id) {
    const os = getDb().prepare(`${SELECT} WHERE o.id = ?`).get(id)
    if (!os) return undefined
    os.itens = getDb().prepare('SELECT * FROM os_itens WHERE os_id = ? ORDER BY id').all(id)
    return os
  },
  create(data) {
    const db = getDb()
    const tx = db.transaction(() => {
      const itens = calcItens(data.itens)
      const numero = db
        .prepare('SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM ordens_servico')
        .get().n
      const status = data.status || 'aberta'
      const info = db
        .prepare(
          `INSERT INTO ordens_servico (numero, cliente_id, veiculo_id, funcionario_id, data_abertura,
           data_fechamento, status, desconto, total, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          numero,
          data.cliente_id,
          data.veiculo_id,
          data.funcionario_id ?? null,
          data.data_abertura || now(),
          STATUS_FECHADOS.includes(status) ? now() : null,
          status,
          Number(data.desconto) || 0,
          calcTotal(itens, data.desconto),
          data.observacoes ?? null
        )
      saveItens(info.lastInsertRowid, itens)
      return info.lastInsertRowid
    })
    return this.get(tx())
  },
  update(id, data) {
    const db = getDb()
    const tx = db.transaction(() => {
      const atual = db.prepare('SELECT * FROM ordens_servico WHERE id = ?').get(id)
      if (!atual) throw new Error('Ordem de serviço não encontrada')
      const itens = calcItens(data.itens)
      const status = data.status || atual.status
      let fechamento = atual.data_fechamento
      if (STATUS_FECHADOS.includes(status)) fechamento = fechamento || now()
      else fechamento = null
      db.prepare(
        `UPDATE ordens_servico SET cliente_id = ?, veiculo_id = ?, funcionario_id = ?, data_fechamento = ?,
         status = ?, desconto = ?, total = ?, observacoes = ? WHERE id = ?`
      ).run(
        data.cliente_id,
        data.veiculo_id,
        data.funcionario_id ?? null,
        fechamento,
        status,
        Number(data.desconto) || 0,
        calcTotal(itens, data.desconto),
        data.observacoes ?? null,
        id
      )
      saveItens(id, itens)
    })
    tx()
    return this.get(id)
  },
  updateStatus(id, status) {
    const fechamento = STATUS_FECHADOS.includes(status) ? now() : null
    getDb()
      .prepare(
        `UPDATE ordens_servico SET status = ?,
         data_fechamento = CASE WHEN ? IS NULL THEN NULL ELSE COALESCE(data_fechamento, ?) END WHERE id = ?`
      )
      .run(status, fechamento, fechamento, id)
    return this.get(id)
  },
  remove(id) {
    getDb().prepare('DELETE FROM ordens_servico WHERE id = ?').run(id)
    return { id }
  }
}
