import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import {
  ensureEditable,
  money,
  positiveId,
  quantity,
  recalculateOrder
} from './service-orders.utils'

function itemRow(id) {
  return getDatabase()
    .prepare(
      `SELECT oi.*, p.name AS product_name, p.sku
       FROM os_items oi INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.id = ?`
    )
    .get(id)
}

function normalizeItem(data = {}) {
  return {
    os_id: positiveId(data.os_id || data.service_order_id, 'Ordem'),
    product_id: positiveId(data.product_id, 'Produto'),
    quantity: quantity(data.quantity),
    discount: money(data.discount || 0, 'O desconto')
  }
}

function saveItem(item, id = null) {
  const database = getDatabase()
  const order = database.prepare('SELECT * FROM service_orders WHERE id = ?').get(item.os_id)
  ensureEditable(order)
  const product = database
    .prepare('SELECT id, selling_price, stock_quantity FROM products WHERE id = ?')
    .get(item.product_id)
  if (!product) throw new Error('Produto não encontrado')
  if (id === null) {
    const existing = database
      .prepare('SELECT id, quantity FROM os_items WHERE os_id = ? AND product_id = ?')
      .get(item.os_id, item.product_id)
    if (existing) {
      item.quantity += existing.quantity
      id = existing.id
    }
  }
  const subtotal = Math.max(
    0,
    Math.round((item.quantity * product.selling_price - item.discount) * 100) / 100
  )
  if (id === null) {
    const result = database
      .prepare(
        `INSERT INTO os_items (os_id, product_id, quantity, unit_price, discount, subtotal)
         VALUES (@os_id, @product_id, @quantity, @unit_price, @discount, @subtotal)`
      )
      .run({ ...item, unit_price: product.selling_price, subtotal })
    id = result.lastInsertRowid
  } else {
    const result = database
      .prepare(
        `UPDATE os_items
         SET product_id = @product_id, quantity = @quantity, discount = @discount,
             unit_price = @unit_price, subtotal = @subtotal, updated_at = CURRENT_TIMESTAMP
         WHERE id = @id AND os_id = @os_id`
      )
      .run({ ...item, id, unit_price: product.selling_price, subtotal })
    if (result.changes === 0) throw new Error('Item de produto não encontrado')
  }
  recalculateOrder(item.os_id)
  return itemRow(id)
}

export function registerOsItemsIpc() {
  ipcMain.handle('os-items:list', (_, serviceOrderId) => {
    const orderId = positiveId(serviceOrderId, 'Ordem')
    return getDatabase()
      .prepare(
        `SELECT oi.*, p.name AS product_name, p.sku
         FROM os_items oi INNER JOIN products p ON p.id = oi.product_id
         WHERE oi.os_id = ? ORDER BY oi.id`
      )
      .all(orderId)
  })

  ipcMain.handle('os-items:create', (_, data) => saveItem(normalizeItem(data)))
  ipcMain.handle('os-items:update', (_, id, data) =>
    saveItem(normalizeItem(data), positiveId(id, 'Item'))
  )
  ipcMain.handle('os-items:delete', (_, id) => {
    const itemId = positiveId(id, 'Item')
    const database = getDatabase()
    const item = database.prepare('SELECT * FROM os_items WHERE id = ?').get(itemId)
    if (!item) throw new Error('Item de produto não encontrado')
    ensureEditable(database.prepare('SELECT * FROM service_orders WHERE id = ?').get(item.os_id))
    database.prepare('DELETE FROM os_items WHERE id = ?').run(itemId)
    recalculateOrder(item.os_id)
    return { success: true }
  })
}
