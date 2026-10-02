import { ipcMain } from 'electron'
import { getDatabase } from '../database'

function normalizeProduct(product) {
  return {
    sku: product.sku?.trim() || null,
    name: product.name?.trim(),
    cost_price: product.cost_price == null ? 0 : Number(product.cost_price),
    selling_price: Number(product.selling_price),
    stock_quantity: product.stock_quantity == null ? 0 : Number(product.stock_quantity),
    min_stock: product.min_stock == null ? 1 : Number(product.min_stock)
  }
}

function validateProduct(product) {
  if (!product.name) throw new Error('Informe o nome do produto')
  if (!Number.isFinite(product.cost_price) || product.cost_price < 0) {
    throw new Error('O preço de custo deve ser um número não negativo')
  }
  if (!Number.isFinite(product.selling_price) || product.selling_price < 0) {
    throw new Error('O preço de venda deve ser um número não negativo')
  }
  if (!Number.isInteger(product.stock_quantity) || product.stock_quantity < 0) {
    throw new Error('O estoque atual deve ser um número inteiro não negativo')
  }
  if (!Number.isInteger(product.min_stock) || product.min_stock < 0) {
    throw new Error('O estoque mínimo deve ser um número inteiro não negativo')
  }
}

function findProduct(id) {
  return getDatabase().prepare('SELECT * FROM products WHERE id = ?').get(id)
}

export function registerProductsIpc() {
  ipcMain.handle('products:list', () => {
    return getDatabase().prepare('SELECT * FROM products ORDER BY name').all()
  })

  ipcMain.handle('products:create', (_, productData) => {
    const product = normalizeProduct(productData)
    validateProduct(product)

    const result = getDatabase()
      .prepare(
        `INSERT INTO products (sku, name, cost_price, selling_price, stock_quantity, min_stock)
         VALUES (@sku, @name, @cost_price, @selling_price, @stock_quantity, @min_stock)`
      )
      .run(product)

    return findProduct(result.lastInsertRowid)
  })

  ipcMain.handle('products:update', (_, id, productData) => {
    const product = normalizeProduct(productData)
    validateProduct(product)

    const result = getDatabase()
      .prepare(
        `UPDATE products
         SET sku = @sku, name = @name, cost_price = @cost_price,
             selling_price = @selling_price, stock_quantity = @stock_quantity,
             min_stock = @min_stock
         WHERE id = @id`
      )
      .run({ ...product, id })

    if (result.changes === 0) throw new Error('Produto não encontrado')
    return findProduct(id)
  })

  ipcMain.handle('products:delete', (_, id) => {
    const result = getDatabase().prepare('DELETE FROM products WHERE id = ?').run(id)

    if (result.changes === 0) throw new Error('Produto não encontrado')
    return { success: true }
  })
}
