import { ipcMain } from 'electron'
import { clientesRepository } from '../db/repositories/clientes'
import { veiculosRepository } from '../db/repositories/veiculos'
import { funcionariosRepository } from '../db/repositories/funcionarios'
import { produtosRepository } from '../db/repositories/produtos'
import { ordensServicoRepository } from '../db/repositories/ordensServico'
import { pdvRepository } from '../db/repositories/pdv'
import { dashboardRepository } from '../db/repositories/dashboard'

function handle(channel, fn) {
  ipcMain.handle(channel, (_event, ...args) => {
    try {
      return { success: true, data: fn(...args) }
    } catch (error) {
      let message = error?.message || String(error)
      if (/UNIQUE constraint failed: veiculos\.placa/.test(message)) {
        message = 'Já existe um veículo cadastrado com esta placa'
      } else if (/FOREIGN KEY constraint failed/.test(message)) {
        message = 'Registro vinculado a outros dados; operação não permitida'
      }
      return { success: false, error: message }
    }
  })
}

function registerCrud(prefix, repo) {
  handle(`${prefix}:list`, (search) => repo.list(search))
  handle(`${prefix}:get`, (id) => repo.get(id))
  handle(`${prefix}:create`, (data) => repo.create(data))
  handle(`${prefix}:update`, (id, data) => repo.update(id, data))
  handle(`${prefix}:remove`, (id) => repo.remove(id))
}

export function registerIpcHandlers() {
  registerCrud('clientes', clientesRepository)
  registerCrud('veiculos', veiculosRepository)
  registerCrud('funcionarios', funcionariosRepository)
  registerCrud('produtos', produtosRepository)
  registerCrud('os', ordensServicoRepository)
  handle('os:updateStatus', (id, status) => ordensServicoRepository.updateStatus(id, status))
  handle('pdv:finalizarVenda', (venda) => pdvRepository.finalizarVenda(venda))
  handle('pdv:listVendas', (options) => pdvRepository.listVendas(options))
  handle('dashboard:resumo', () => dashboardRepository.resumo())
}
