import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import {
  ensureEditable,
  money,
  positiveId,
  quantity,
  recalculateOrder
} from './service-orders.utils'

function serviceRow(id) {
  return getDatabase()
    .prepare(
      `SELECT os.*, e.name AS employee_name
       FROM os_services os LEFT JOIN employees e ON e.id = os.employee_id
       WHERE os.id = ?`
    )
    .get(id)
}

function normalizeService(data = {}) {
  const description = data.description?.trim()
  if (!description) throw new Error('Informe a descrição do serviço')
  const employeeId =
    data.employee_id == null || data.employee_id === ''
      ? null
      : positiveId(data.employee_id, 'Funcionário')
  if (
    employeeId !== null &&
    !getDatabase()
      .prepare('SELECT id FROM employees WHERE id = ? AND is_active = 1')
      .get(employeeId)
  ) {
    throw new Error('Funcionário ativo não encontrado')
  }
  return {
    os_id: positiveId(data.os_id || data.service_order_id, 'Ordem'),
    description,
    employee_id: employeeId,
    quantity: quantity(data.quantity || 1),
    price: money(data.price ?? data.unit_price, 'O valor do serviço'),
    discount: money(data.discount || 0, 'O desconto')
  }
}

function saveService(service, id = null) {
  const database = getDatabase()
  ensureEditable(database.prepare('SELECT * FROM service_orders WHERE id = ?').get(service.os_id))
  const total = Math.max(
    0,
    Math.round((service.quantity * service.price - service.discount) * 100) / 100
  )
  if (id === null) {
    const result = database
      .prepare(
        `INSERT INTO os_services
           (os_id, description, price, employee_id, quantity, discount, total)
         VALUES (@os_id, @description, @price, @employee_id, @quantity, @discount, @total)`
      )
      .run({ ...service, total })
    id = result.lastInsertRowid
  } else {
    const result = database
      .prepare(
        `UPDATE os_services
         SET description = @description, price = @price, employee_id = @employee_id,
             quantity = @quantity, discount = @discount, total = @total,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = @id AND os_id = @os_id`
      )
      .run({ ...service, id, total })
    if (result.changes === 0) throw new Error('Serviço da ordem não encontrado')
  }
  recalculateOrder(service.os_id)
  return serviceRow(id)
}

export function registerOsServicesIpc() {
  ipcMain.handle('os-services:list', (_, serviceOrderId) => {
    const orderId = positiveId(serviceOrderId, 'Ordem')
    return getDatabase()
      .prepare(
        `SELECT os.*, e.name AS employee_name
         FROM os_services os LEFT JOIN employees e ON e.id = os.employee_id
         WHERE os.os_id = ? ORDER BY os.id`
      )
      .all(orderId)
  })
  ipcMain.handle('os-services:create', (_, data) => saveService(normalizeService(data)))
  ipcMain.handle('os-services:update', (_, id, data) =>
    saveService(normalizeService(data), positiveId(id, 'Serviço'))
  )
  ipcMain.handle('os-services:delete', (_, id) => {
    const serviceId = positiveId(id, 'Serviço')
    const database = getDatabase()
    const service = database.prepare('SELECT * FROM os_services WHERE id = ?').get(serviceId)
    if (!service) throw new Error('Serviço da ordem não encontrado')
    ensureEditable(database.prepare('SELECT * FROM service_orders WHERE id = ?').get(service.os_id))
    database.prepare('DELETE FROM os_services WHERE id = ?').run(serviceId)
    recalculateOrder(service.os_id)
    return { success: true }
  })
}
