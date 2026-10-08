import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE TABLE IF NOT EXISTS veiculos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  placa TEXT NOT NULL UNIQUE,
  marca TEXT,
  modelo TEXT,
  ano INTEGER,
  cor TEXT,
  km INTEGER,
  observacoes TEXT
);
CREATE TABLE IF NOT EXISTS funcionarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cpf TEXT,
  cargo TEXT,
  telefone TEXT,
  salario REAL NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
);
CREATE TABLE IF NOT EXISTS empresa (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nome TEXT NOT NULL DEFAULT '',
  documento TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('peca', 'servico')),
  preco_custo REAL NOT NULL DEFAULT 0,
  preco_venda REAL NOT NULL DEFAULT 0,
  estoque INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ordens_servico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER NOT NULL UNIQUE,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  veiculo_id INTEGER NOT NULL REFERENCES veiculos(id),
  funcionario_id INTEGER REFERENCES funcionarios(id),
  data_abertura TEXT NOT NULL,
  data_fechamento TEXT,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'aguardando_pecas', 'concluida', 'entregue', 'cancelada')),
  desconto REAL NOT NULL DEFAULT 0,
  desconto_pecas REAL,
  desconto_pecas_tipo TEXT,
  desconto_servicos REAL,
  desconto_servicos_tipo TEXT,
  total REAL NOT NULL DEFAULT 0,
  observacoes TEXT
);
CREATE TABLE IF NOT EXISTS os_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  os_id INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  produto_id INTEGER REFERENCES produtos(id),
  tipo TEXT CHECK (tipo IN ('peca', 'servico')),
  descricao TEXT NOT NULL,
  quantidade REAL NOT NULL,
  valor_unitario REAL NOT NULL,
  valor_total REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS vendas_pdv (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  funcionario_id INTEGER REFERENCES funcionarios(id),
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito')),
  desconto REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS venda_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL REFERENCES vendas_pdv(id) ON DELETE CASCADE,
  produto_id INTEGER REFERENCES produtos(id),
  descricao TEXT NOT NULL,
  quantidade REAL NOT NULL,
  valor_unitario REAL NOT NULL,
  valor_total REAL NOT NULL
);
`

function seed(database) {
  const count = (t) => database.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n
  const run = database.transaction(() => {
    if (count('clientes') === 0) {
      const ins = database.prepare(
        'INSERT INTO clientes (nome, cpf, telefone, email, endereco) VALUES (?, ?, ?, ?, ?)'
      )
      ins.run('João da Silva', '123.456.789-09', '(11) 98888-1111', 'joao@email.com', 'Rua A, 100')
      ins.run(
        'Maria Oliveira',
        '987.654.321-00',
        '(11) 97777-2222',
        'maria@email.com',
        'Rua B, 200'
      )
      ins.run(
        'Carlos Pereira',
        '111.444.777-35',
        '(11) 96666-3333',
        'carlos@email.com',
        'Av. C, 300'
      )
    }
    if (count('veiculos') === 0) {
      const ins = database.prepare(
        'INSERT INTO veiculos (cliente_id, placa, marca, modelo, ano, cor, km, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      ins.run(1, 'ABC1234', 'Fiat', 'Uno', 2012, 'Prata', 150000, '')
      ins.run(2, 'BRA2E19', 'Volkswagen', 'Gol', 2020, 'Branco', 45000, '')
      ins.run(3, 'DEF5G67', 'Chevrolet', 'Onix', 2021, 'Preto', 30000, '')
    }
    if (count('funcionarios') === 0) {
      const ins = database.prepare(
        'INSERT INTO funcionarios (nome, cpf, cargo, telefone, salario, ativo) VALUES (?, ?, ?, ?, ?, ?)'
      )
      ins.run('Pedro Santos', '222.333.444-05', 'Mecânico', '(11) 95555-4444', 3500, 1)
      ins.run('Ana Costa', '333.444.555-66', 'Atendente', '(11) 94444-5555', 2500, 1)
    }
    if (count('produtos') === 0) {
      const ins = database.prepare(
        'INSERT INTO produtos (descricao, tipo, preco_custo, preco_venda, estoque) VALUES (?, ?, ?, ?, ?)'
      )
      ins.run('Óleo de motor 5W30 (1L)', 'peca', 25, 45, 40)
      ins.run('Filtro de óleo', 'peca', 15, 30, 25)
      ins.run('Pastilha de freio (jogo)', 'peca', 60, 120, 10)
      ins.run('Vela de ignição', 'peca', 12, 25, 30)
      ins.run('Troca de óleo', 'servico', 0, 60, 0)
      ins.run('Alinhamento e balanceamento', 'servico', 0, 120, 0)
      ins.run('Revisão geral', 'servico', 0, 350, 0)
    }
  })
  run()
}

export function getDb() {
  if (!db) {
    db = new Database(join(app.getPath('userData'), 'oficina.sqlite'))
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.exec(SCHEMA)
    db.exec('INSERT OR IGNORE INTO empresa (id) VALUES (1)')
    const osColumns = new Set(
      db
        .prepare('PRAGMA table_info(ordens_servico)')
        .all()
        .map((column) => column.name)
    )
    for (const [name, type] of [
      ['desconto_pecas', 'REAL'],
      ['desconto_pecas_tipo', 'TEXT'],
      ['desconto_servicos', 'REAL'],
      ['desconto_servicos_tipo', 'TEXT']
    ]) {
      if (!osColumns.has(name)) {
        db.exec(`ALTER TABLE ordens_servico ADD COLUMN ${name} ${type}`)
      }
    }
    const itemColumns = new Set(
      db
        .prepare('PRAGMA table_info(os_itens)')
        .all()
        .map((column) => column.name)
    )
    if (!itemColumns.has('tipo')) {
      db.exec('ALTER TABLE os_itens ADD COLUMN tipo TEXT')
    }
    seed(db)
  }
  return db
}

export function closeDb() {
  if (db) {
    db.close()
    db = undefined
  }
}
