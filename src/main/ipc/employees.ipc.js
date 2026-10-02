import { ipcMain } from 'electron'
import { getDatabase } from '../database'

function positiveId(id, label = 'ID') {
  const value = Number(id)
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} inválido`)
  return value
}

function normalizeEmployee(employee = {}) {
  const commission =
    employee.commission_percentage == null ? 0 : Number(employee.commission_percentage)
  return {
    name: employee.name?.trim(),
    cpf_cnpj: employee.cpf_cnpj?.trim() || null,
    phone: employee.phone?.trim() || null,
    email: employee.email?.trim().toLowerCase() || null,
    role: employee.role?.trim() || 'FUNCIONARIO',
    commission_percentage: commission,
    is_active: employee.is_active === false || employee.is_active === 0 ? 0 : 1
  }
}

function validateEmployee(employee) {
  if (!employee.name) throw new Error('Informe o nome do funcionário')
  if (employee.cpf_cnpj && !/^\d{11}$/.test(employee.cpf_cnpj.replace(/\D/g, ''))) {
    throw new Error('CPF inválido')
  }
  if (employee.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
    throw new Error('E-mail inválido')
  }
  if (
    !Number.isFinite(employee.commission_percentage) ||
    employee.commission_percentage < 0 ||
    employee.commission_percentage > 100
  ) {
    throw new Error('A comissão deve estar entre 0 e 100')
  }
}

function employeeRow(id) {
  const employee = getDatabase()
    .prepare(
      `SELECT id, name, cpf_cnpj, phone, email, role,
              is_active, is_active AS active, commission_percentage,
              created_at, updated_at
       FROM employees WHERE id = ?`
    )
    .get(id)
  if (!employee) throw new Error('Funcionário não encontrado')
  return employee
}

export function registerEmployeesIpc() {
  ipcMain.handle('employees:list', (_, filters = {}) => {
    const search = String(filters.search || '').trim()
    const active =
      filters.active === 'all' || filters.active == null ? null : Number(filters.active)
    return getDatabase()
      .prepare(
        `SELECT id, name, cpf_cnpj, phone, email, role,
                is_active, is_active AS active, commission_percentage,
                created_at, updated_at
         FROM employees
         WHERE (@search = '' OR name LIKE @pattern OR cpf_cnpj LIKE @pattern
                OR phone LIKE @pattern OR email LIKE @pattern)
           AND (@active IS NULL OR is_active = @active)
         ORDER BY name`
      )
      .all({ search, pattern: `%${search}%`, active })
  })

  ipcMain.handle('employees:get', (_, id) => employeeRow(positiveId(id, 'Funcionário')))

  ipcMain.handle('employees:create', (_, data) => {
    const employee = normalizeEmployee(data)
    validateEmployee(employee)
    try {
      const result = getDatabase()
        .prepare(
          `INSERT INTO employees
             (name, cpf_cnpj, phone, email, role, commission_percentage, is_active)
           VALUES (@name, @cpf_cnpj, @phone, @email, @role, @commission_percentage, @is_active)`
        )
        .run(employee)
      return employeeRow(result.lastInsertRowid)
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new Error('CPF ou e-mail já cadastrado')
      throw new Error('Não foi possível cadastrar o funcionário')
    }
  })

  ipcMain.handle('employees:update', (_, id, data) => {
    const employeeId = positiveId(id, 'Funcionário')
    const employee = normalizeEmployee(data)
    validateEmployee(employee)
    try {
      const result = getDatabase()
        .prepare(
          `UPDATE employees
           SET name = @name, cpf_cnpj = @cpf_cnpj, phone = @phone, email = @email,
               role = @role, commission_percentage = @commission_percentage,
               is_active = @is_active, updated_at = CURRENT_TIMESTAMP
           WHERE id = @id`
        )
        .run({ ...employee, id: employeeId })
      if (result.changes === 0) throw new Error('Funcionário não encontrado')
      return employeeRow(employeeId)
    } catch (error) {
      if (error.message === 'Funcionário não encontrado') throw error
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new Error('CPF ou e-mail já cadastrado')
      throw new Error('Não foi possível atualizar o funcionário')
    }
  })

  ipcMain.handle('employees:delete', (_, id) => {
    const employeeId = positiveId(id, 'Funcionário')
    const database = getDatabase()
    const linked = database
      .prepare('SELECT COUNT(*) AS count FROM service_orders WHERE employee_id = ?')
      .get(employeeId).count
    if (linked > 0) {
      database
        .prepare('UPDATE employees SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(employeeId)
      return { success: true, deactivated: true }
    }
    const result = database.prepare('DELETE FROM employees WHERE id = ?').run(employeeId)
    if (result.changes === 0) throw new Error('Funcionário não encontrado')
    return { success: true, deactivated: false }
  })

  ipcMain.handle('employees:toggle-active', (_, id, active) => {
    const employeeId = positiveId(id, 'Funcionário')
    const value = active === false || active === 0 ? 0 : 1
    const result = getDatabase()
      .prepare('UPDATE employees SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(value, employeeId)
    if (result.changes === 0) throw new Error('Funcionário não encontrado')
    return employeeRow(employeeId)
  })
}
