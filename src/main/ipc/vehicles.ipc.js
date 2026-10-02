import { ipcMain } from 'electron'
import { getDatabase } from '../database'

function normalizeVehicle(vehicle) {
  return {
    client_id: Number(vehicle.client_id),
    plate: vehicle.plate?.trim().toUpperCase(),
    brand: vehicle.brand?.trim(),
    model: vehicle.model?.trim(),
    year: vehicle.year?.trim() || null,
    color: vehicle.color?.trim() || null,
    current_km:
      vehicle.current_km === '' || vehicle.current_km == null ? null : Number(vehicle.current_km)
  }
}

function validateVehicle(vehicle) {
  if (!Number.isInteger(vehicle.client_id) || vehicle.client_id <= 0) {
    throw new Error('Selecione o cliente do veículo')
  }
  if (!vehicle.plate) throw new Error('Informe a placa do veículo')
  if (!vehicle.brand) throw new Error('Informe a marca do veículo')
  if (!vehicle.model) throw new Error('Informe o modelo do veículo')
  if (
    vehicle.current_km !== null &&
    (!Number.isInteger(vehicle.current_km) || vehicle.current_km < 0)
  ) {
    throw new Error('A quilometragem deve ser um número inteiro não negativo')
  }
}

function findVehicle(id) {
  return getDatabase()
    .prepare(
      `SELECT vehicles.*, clients.name AS client_name
       FROM vehicles
       INNER JOIN clients ON clients.id = vehicles.client_id
       WHERE vehicles.id = ?`
    )
    .get(id)
}

export function registerVehiclesIpc() {
  ipcMain.handle('vehicles:list', () => {
    return getDatabase()
      .prepare(
        `SELECT vehicles.*, clients.name AS client_name
         FROM vehicles
         INNER JOIN clients ON clients.id = vehicles.client_id
         ORDER BY vehicles.plate`
      )
      .all()
  })

  ipcMain.handle('vehicles:create', (_, vehicleData) => {
    const vehicle = normalizeVehicle(vehicleData)
    validateVehicle(vehicle)

    const result = getDatabase()
      .prepare(
        `INSERT INTO vehicles (client_id, plate, brand, model, year, color, current_km)
         VALUES (@client_id, @plate, @brand, @model, @year, @color, @current_km)`
      )
      .run(vehicle)

    return findVehicle(result.lastInsertRowid)
  })

  ipcMain.handle('vehicles:update', (_, id, vehicleData) => {
    const vehicle = normalizeVehicle(vehicleData)
    validateVehicle(vehicle)

    const result = getDatabase()
      .prepare(
        `UPDATE vehicles
         SET client_id = @client_id, plate = @plate, brand = @brand, model = @model,
             year = @year, color = @color, current_km = @current_km
         WHERE id = @id`
      )
      .run({ ...vehicle, id })

    if (result.changes === 0) throw new Error('Veículo não encontrado')
    return findVehicle(id)
  })

  ipcMain.handle('vehicles:delete', (_, id) => {
    const result = getDatabase().prepare('DELETE FROM vehicles WHERE id = ?').run(id)

    if (result.changes === 0) throw new Error('Veículo não encontrado')
    return { success: true }
  })
}
