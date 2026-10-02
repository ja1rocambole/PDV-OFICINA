import { getDatabase } from '../database'

export const ORDER_STATUSES = [
  'ORCAMENTO',
  'APROVADO',
  'EM_ANDAMENTO',
  'AGUARDANDO_PECA',
  'CONCLUIDO',
  'CANCELADO'
]
export const EDITABLE_STATUSES = ['ORCAMENTO', 'APROVADO', 'EM_ANDAMENTO', 'AGUARDANDO_PECA']

export function positiveId(id, label = 'ID') {
  const value = Number(id)
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} inválido`)
  return value
}

export function money(value, label) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0)
    throw new Error(`${label} deve ser um número não negativo`)
  return Math.round(number * 100) / 100
}

export function quantity(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0)
    throw new Error('A quantidade deve ser maior que zero')
  return number
}

export function ensureEditable(order) {
  if (!order) throw new Error('Ordem de serviço não encontrada')
  if (!EDITABLE_STATUSES.includes(order.status)) {
    throw new Error('Esta ordem não permite alterações no status atual')
  }
}

export function ensureRelations(clientId, vehicleId, employeeId = null) {
  const database = getDatabase()
  const client = database.prepare('SELECT id FROM clients WHERE id = ?').get(clientId)
  if (!client) throw new Error('Cliente não encontrado')
  const vehicle = database
    .prepare('SELECT id FROM vehicles WHERE id = ? AND client_id = ?')
    .get(vehicleId, clientId)
  if (!vehicle) throw new Error('O veículo não pertence ao cliente selecionado')
  if (employeeId !== null) {
    const employee = database
      .prepare('SELECT id FROM employees WHERE id = ? AND is_active = 1')
      .get(employeeId)
    if (!employee) throw new Error('Funcionário ativo não encontrado')
  }
}

export function recalculateOrder(orderId) {
  const database = getDatabase()
  const parts = database
    .prepare('SELECT COALESCE(SUM(subtotal), 0) AS total FROM os_items WHERE os_id = ?')
    .get(orderId).total
  const services = database
    .prepare('SELECT COALESCE(SUM(total), 0) AS total FROM os_services WHERE os_id = ?')
    .get(orderId).total
  const order = database.prepare('SELECT discount FROM service_orders WHERE id = ?').get(orderId)
  const discount = money(order?.discount || 0, 'O desconto')
  const total = Math.max(0, Math.round((parts + services - discount) * 100) / 100)
  database
    .prepare(
      `UPDATE service_orders
       SET total_parts = ?, total_services = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(parts, services, total, orderId)
  return { total_parts: parts, total_services: services, discount, total_amount: total }
}

export function orderRow(id) {
  return getDatabase()
    .prepare(
      `SELECT so.*, c.name AS client_name, v.plate, v.brand, v.model,
              e.name AS employee_name
       FROM service_orders so
       INNER JOIN clients c ON c.id = so.client_id
       INNER JOIN vehicles v ON v.id = so.vehicle_id
       LEFT JOIN employees e ON e.id = so.employee_id
       WHERE so.id = ?`
    )
    .get(id)
}
