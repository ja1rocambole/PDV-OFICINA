import { getDb } from '../database'

export function createCrudRepository(table, columns, searchColumns, orderBy = 'id DESC') {
  const pick = (data) => columns.map((c) => data[c] ?? null)
  return {
    list(search) {
      const term = (search ?? '').toString().trim()
      if (!term || !searchColumns.length) {
        return getDb().prepare(`SELECT * FROM ${table} ORDER BY ${orderBy}`).all()
      }
      const where = searchColumns.map((c) => `${c} LIKE ?`).join(' OR ')
      return getDb()
        .prepare(`SELECT * FROM ${table} WHERE ${where} ORDER BY ${orderBy}`)
        .all(...searchColumns.map(() => `%${term}%`))
    },
    get(id) {
      return getDb().prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)
    },
    create(data) {
      const info = getDb()
        .prepare(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
        )
        .run(...pick(data))
      return this.get(info.lastInsertRowid)
    },
    update(id, data) {
      getDb()
        .prepare(`UPDATE ${table} SET ${columns.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
        .run(...pick(data), id)
      return this.get(id)
    },
    remove(id) {
      getDb().prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
      return { id }
    }
  }
}
