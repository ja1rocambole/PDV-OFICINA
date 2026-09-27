import { ipcMain } from 'electron'
import { getDatabase } from '../database'

function normalizeClient(client) {
  return {
    name: client.name?.trim(),
    cpf_cnpj: client.cpf_cnpj?.trim() || null,
    phone: client.phone?.trim(),
    email: client.email?.trim() || null,
    address: client.address?.trim() || null
  }
}

function validateClient(client) {
  if (!client.name) throw new Error('O nome do cliente é obrigatório')
  if (!client.phone) throw new Error('O telefone do cliente é obrigatório')
}

export function registerClientsIpc() {
  ipcMain.handle('clients:list', () => {
    return getDatabase().prepare('SELECT * FROM clients ORDER BY name').all()
  })

  ipcMain.handle('clients:create', (_, clientData) => {
    const client = normalizeClient(clientData)
    validateClient(client)

    const result = getDatabase()
      .prepare(
        `INSERT INTO clients (name, cpf_cnpj, phone, email, address)
				 VALUES (@name, @cpf_cnpj, @phone, @email, @address)`
      )
      .run(client)

    return getDatabase().prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('clients:update', (_, id, clientData) => {
    const client = normalizeClient(clientData)
    validateClient(client)

    const result = getDatabase()
      .prepare(
        `UPDATE clients
				 SET name = @name, cpf_cnpj = @cpf_cnpj, phone = @phone,
						 email = @email, address = @address
				 WHERE id = @id`
      )
      .run({ ...client, id })

    if (result.changes === 0) throw new Error('Cliente não encontrado')
    return getDatabase().prepare('SELECT * FROM clients WHERE id = ?').get(id)
  })

  ipcMain.handle('clients:delete', (_, id) => {
    const result = getDatabase().prepare('DELETE FROM clients WHERE id = ?').run(id)

    if (result.changes === 0) throw new Error('Cliente não encontrado')
    return { success: true }
  })
}
