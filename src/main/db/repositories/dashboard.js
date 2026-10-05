import { getDb } from '../database'
import { ordensServicoRepository } from './ordensServico'

export const dashboardRepository = {
  resumo() {
    const db = getDb()
    const n = (sql) => db.prepare(sql).get().n
    const mes = `strftime('%Y-%m', 'now', 'localtime')`
    const vendas = n(
      `SELECT COALESCE(SUM(total), 0) AS n FROM vendas_pdv WHERE strftime('%Y-%m', data) = ${mes}`
    )
    const os = n(
      `SELECT COALESCE(SUM(total), 0) AS n FROM ordens_servico
       WHERE status IN ('concluida', 'entregue') AND strftime('%Y-%m', data_fechamento) = ${mes}`
    )
    return {
      totalClientes: n('SELECT COUNT(*) AS n FROM clientes'),
      totalVeiculos: n('SELECT COUNT(*) AS n FROM veiculos'),
      osAbertas: n(
        `SELECT COUNT(*) AS n FROM ordens_servico WHERE status IN ('aberta', 'em_andamento')`
      ),
      faturamentoMes: vendas + os,
      ultimasOS: ordensServicoRepository.list().slice(0, 5)
    }
  }
}
