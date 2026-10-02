import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import {
  EDITABLE_STATUSES,
  ORDER_STATUSES,
  ensureEditable,
  ensureRelations,
  money,
  orderRow,
  positiveId,
  recalculateOrder
} from './service-orders.utils'

function normalizeOrder(data = {}) {
  const clientId = positiveId(data.client_id, 'Cliente')
  const vehicleId = positiveId(data.vehicle_id, 'Veículo')
  const employeeId =
    data.employee_id == null || data.employee_id === ''
      ? null
      : positiveId(data.employee_id, 'Funcionário')
  const discount = money(data.discount || 0, 'O desconto')
  return {
    client_id: clientId,
    vehicle_id: vehicleId,
    employee_id: employeeId,
    status: data.status || 'ORCAMENTO',
    problem_description: data.problem_description?.trim() || null,
    notes: data.notes?.trim() || null,
    discount,
    payment_status: data.payment_status?.trim() || 'PENDENTE',
    payment_method: data.payment_method?.trim() || null
  }
}

function validateOrder(order) {
  if (!ORDER_STATUSES.includes(order.status)) throw new Error('Status da ordem inválido')
  ensureRelations(order.client_id, order.vehicle_id, order.employee_id)
}

export function registerServiceOrdersIpc() {
  ipcMain.handle('service-orders:list', (_, filters = {}) => {
    const database = getDatabase()
    const search = String(filters.search || '').trim()
    const status = filters.status || null
    const from = filters.from || null
    const to = filters.to || null
    return database
      .prepare(
        `SELECT so.*, c.name AS client_name, v.plate, v.brand, v.model,
                e.name AS employee_name
         FROM service_orders so
         INNER JOIN clients c ON c.id = so.client_id
         INNER JOIN vehicles v ON v.id = so.vehicle_id
         LEFT JOIN employees e ON e.id = so.employee_id
         WHERE (@search = '' OR CAST(so.id AS TEXT) LIKE @pattern
                OR c.name LIKE @pattern OR v.plate LIKE @pattern)
           AND (@status IS NULL OR so.status = @status)
           AND (@from IS NULL OR date(so.created_at) >= date(@from))
           AND (@to IS NULL OR date(so.created_at) <= date(@to))
         ORDER BY so.id DESC`
      )
      .all({ search, pattern: `%${search}%`, status, from, to })
  })

  ipcMain.handle('service-orders:get', (_, id) => {
    const orderId = positiveId(id, 'Ordem')
    const order = orderRow(orderId)
    if (!order) throw new Error('Ordem de serviço não encontrada')
    return {
      ...order,
      items: getDatabase()
        .prepare(
          'SELECT oi.*, p.name AS product_name, p.sku FROM os_items oi INNER JOIN products p ON p.id = oi.product_id WHERE oi.os_id = ? ORDER BY oi.id'
        )
        .all(orderId),
      services: getDatabase()
        .prepare(
          'SELECT os.*, e.name AS employee_name FROM os_services os LEFT JOIN employees e ON e.id = os.employee_id WHERE os.os_id = ? ORDER BY os.id'
        )
        .all(orderId)
    }
  })

  ipcMain.handle('service-orders:create', (_, data) => {
    const order = normalizeOrder(data)
    validateOrder(order)
    const result = getDatabase()
      .prepare(
        `INSERT INTO service_orders
           (client_id, vehicle_id, employee_id, status, problem_description, notes,
            discount, payment_status, payment_method)
         VALUES (@client_id, @vehicle_id, @employee_id, @status, @problem_description,
                 @notes, @discount, @payment_status, @payment_method)`
      )
      .run(order)
    return orderRow(result.lastInsertRowid)
  })

  ipcMain.handle('service-orders:update', (_, id, data) => {
    const orderId = positiveId(id, 'Ordem')
    const current = orderRow(orderId)
    ensureEditable(current)
    const order = normalizeOrder(data)
    validateOrder(order)
    getDatabase()
      .prepare(
        `UPDATE service_orders
         SET client_id = @client_id, vehicle_id = @vehicle_id, employee_id = @employee_id,
             problem_description = @problem_description, notes = @notes,
             discount = @discount, payment_status = @payment_status,
             payment_method = @payment_method, updated_at = CURRENT_TIMESTAMP
         WHERE id = @id`
      )
      .run({ ...order, id: orderId })
    return { ...orderRow(orderId), ...recalculateOrder(orderId) }
  })

  ipcMain.handle('service-orders:delete', (_, id) => {
    const orderId = positiveId(id, 'Ordem')
    const order = orderRow(orderId)
    if (!order) throw new Error('Ordem de serviço não encontrada')
    if (!EDITABLE_STATUSES.includes(order.status))
      throw new Error('Ordens concluídas, entregues ou canceladas não podem ser excluídas')
    getDatabase().prepare('DELETE FROM service_orders WHERE id = ?').run(orderId)
    return { success: true }
  })

  ipcMain.handle('service-orders:update-status', (_, id, status) => {
    const orderId = positiveId(id, 'Ordem')
    const order = orderRow(orderId)
    if (!order) throw new Error('Ordem de serviço não encontrada')
    if (!ORDER_STATUSES.includes(status)) throw new Error('Status da ordem inválido')
    const allowed = {
      ORCAMENTO: ['APROVADO', 'CANCELADO'],
      APROVADO: ['EM_ANDAMENTO', 'CANCELADO'],
      EM_ANDAMENTO: ['AGUARDANDO_PECA', 'CONCLUIDO', 'CANCELADO'],
      AGUARDANDO_PECA: ['EM_ANDAMENTO', 'CANCELADO'],
      CONCLUIDO: [],
      CANCELADO: ['ORCAMENTO']
    }
    if (!allowed[order.status].includes(status))
      throw new Error('Transição de status não permitida')
    const dates = {
      started_at: status === 'EM_ANDAMENTO' ? new Date().toISOString() : null,
      finished_at: status === 'CONCLUIDO' ? new Date().toISOString() : null,
      delivered_at: status === 'ENTREGUE' ? new Date().toISOString() : null
    }
    getDatabase()
      .prepare(
        `UPDATE service_orders
         SET status = @status,
             started_at = COALESCE(@started_at, started_at),
             finished_at = COALESCE(@finished_at, finished_at),
             delivered_at = COALESCE(@delivered_at, delivered_at),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = @id`
      )
      .run({ status, id: orderId, ...dates })
    return orderRow(orderId)
  })
}
