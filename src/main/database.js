import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let database

const schema = `
CREATE TABLE IF NOT EXISTS clients (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	cpf_cnpj TEXT,
	phone TEXT NOT NULL,
	email TEXT,
	address TEXT,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	client_id INTEGER NOT NULL,
	plate TEXT UNIQUE NOT NULL,
	brand TEXT NOT NULL,
	model TEXT NOT NULL,
	year TEXT,
	color TEXT,
	current_km INTEGER,
	FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	sku TEXT UNIQUE,
	name TEXT NOT NULL,
	cost_price REAL DEFAULT 0.0,
	selling_price REAL NOT NULL,
	stock_quantity INTEGER DEFAULT 0,
	min_stock INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS employees (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	cpf_cnpj TEXT UNIQUE,
	phone TEXT,
	email TEXT UNIQUE,
	role TEXT NOT NULL DEFAULT 'FUNCIONARIO',
	commission_percentage REAL NOT NULL DEFAULT 0.0,
	is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_orders (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	client_id INTEGER NOT NULL,
	vehicle_id INTEGER NOT NULL,
	employee_id INTEGER,
	status TEXT CHECK(status IN ('ORCAMENTO', 'APROVADO', 'EM_ANDAMENTO', 'AGUARDANDO_PECA', 'CONCLUIDO', 'CANCELADO')) DEFAULT 'ORCAMENTO',
	problem_description TEXT,
	notes TEXT,
	discount REAL DEFAULT 0.0,
	total_parts REAL DEFAULT 0.0,
	total_services REAL DEFAULT 0.0,
	total_amount REAL DEFAULT 0.0,
	payment_status TEXT DEFAULT 'PENDENTE',
	payment_method TEXT,
	started_at DATETIME,
	finished_at DATETIME,
	delivered_at DATETIME,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (client_id) REFERENCES clients(id),
	FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
	FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS os_items (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	os_id INTEGER NOT NULL,
	product_id INTEGER NOT NULL,
	quantity INTEGER NOT NULL,
	unit_price REAL NOT NULL,
	discount REAL NOT NULL DEFAULT 0.0,
	subtotal REAL NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (os_id) REFERENCES service_orders(id) ON DELETE CASCADE,
	FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS os_services (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	os_id INTEGER NOT NULL,
	description TEXT NOT NULL,
	price REAL NOT NULL,
	employee_id INTEGER,
	quantity REAL NOT NULL DEFAULT 1,
	discount REAL NOT NULL DEFAULT 0.0,
	total REAL NOT NULL DEFAULT 0.0,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
	FOREIGN KEY (os_id) REFERENCES service_orders(id) ON DELETE CASCADE
);
`

function ensureColumn(table, column, definition) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all()
  if (!columns.some(({ name }) => name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

export function initializeDatabase() {
  if (database) return database

  const databasePath = join(app.getPath('userData'), 'pdv-oficina.sqlite')
  database = new Database(databasePath)
  database.pragma('foreign_keys = ON')
  database.exec(schema)

  ensureColumn('employees', 'updated_at', 'DATETIME')
  ensureColumn('employees', 'commission_percentage', 'REAL NOT NULL DEFAULT 0.0')
  ensureColumn('service_orders', 'employee_id', 'INTEGER')
  ensureColumn('service_orders', 'discount', 'REAL DEFAULT 0.0')
  ensureColumn('service_orders', 'payment_status', "TEXT DEFAULT 'PENDENTE'")
  ensureColumn('service_orders', 'payment_method', 'TEXT')
  ensureColumn('service_orders', 'started_at', 'DATETIME')
  ensureColumn('service_orders', 'finished_at', 'DATETIME')
  ensureColumn('service_orders', 'delivered_at', 'DATETIME')
  ensureColumn('os_items', 'discount', 'REAL NOT NULL DEFAULT 0.0')
  ensureColumn('os_items', 'created_at', 'DATETIME')
  ensureColumn('os_items', 'updated_at', 'DATETIME')
  ensureColumn('os_services', 'employee_id', 'INTEGER')
  ensureColumn('os_services', 'quantity', 'REAL NOT NULL DEFAULT 1')
  ensureColumn('os_services', 'discount', 'REAL NOT NULL DEFAULT 0.0')
  ensureColumn('os_services', 'total', 'REAL NOT NULL DEFAULT 0.0')
  ensureColumn('os_services', 'created_at', 'DATETIME')
  ensureColumn('os_services', 'updated_at', 'DATETIME')

  const tables = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all()
    .map(({ name }) => name)

  console.log(`[Banco] Arquivo: ${databasePath}`)
  console.log(`[Banco] Tabelas: ${tables.join(', ')}`)

  return database
}

export function getDatabase() {
  if (!database) throw new Error('Banco de dados ainda não foi inicializado')
  return database
}
