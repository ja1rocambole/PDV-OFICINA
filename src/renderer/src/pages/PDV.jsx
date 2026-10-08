import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Modal,
  Empty,
  InputNumber,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import { DeleteOutlined, HistoryOutlined, PrinterOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import PageHeader from '../components/PageHeader'
import { call } from '../utils/api'
import { formatCurrency, round2 } from '../utils/format'

const pagamentos = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'cartao_credito', label: 'Cartão de crédito' }
]
const rotuloPagamento = (value) =>
  pagamentos.find((pagamento) => pagamento.value === value)?.label || value

export default function PDV() {
  const [produtos, setProdutos] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [search, setSearch] = useState('')
  const [carrinho, setCarrinho] = useState([])
  const [desconto, setDesconto] = useState(0)
  const [pagamento, setPagamento] = useState('dinheiro')
  const [funcionarioId, setFuncionarioId] = useState()
  const [saving, setSaving] = useState(false)
  const [vendas, setVendas] = useState([])
  const [totalVendas, setTotalVendas] = useState(0)
  const [paginaHistorico, setPaginaHistorico] = useState(1)
  const [tamanhoPaginaHistorico, setTamanhoPaginaHistorico] = useState(8)
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [historicoLoading, setHistoricoLoading] = useState(false)
  const [cupom, setCupom] = useState(null)
  const [empresa, setEmpresa] = useState(null)

  const load = useCallback(async () => {
    const [p, f] = await Promise.all([
      call(window.api.produtos.list('')),
      call(window.api.funcionarios.list(''))
    ])
    if (p) setProdutos(p.filter((produto) => produto.tipo === 'peca'))
    if (f) {
      const ativos = f.filter((x) => x.ativo)
      setFuncionarios(ativos)
      setFuncionarioId((cur) => cur ?? ativos[0]?.id)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const loadVendas = useCallback(
    async (page = paginaHistorico, pageSize = tamanhoPaginaHistorico) => {
      const data = await call(window.api.pdv.listVendas({ page, pageSize }))
      if (data) {
        setVendas(data.vendas)
        setTotalVendas(data.total)
      }
      return data
    },
    [paginaHistorico, tamanhoPaginaHistorico]
  )

  const paginarHistorico = async (page, pageSize) => {
    setPaginaHistorico(page)
    setTamanhoPaginaHistorico(pageSize)
    setHistoricoLoading(true)
    await loadVendas(page, pageSize)
    setHistoricoLoading(false)
  }

  const abrirHistorico = async () => {
    setHistoricoAberto(true)
    setHistoricoLoading(true)
    await loadVendas()
    setHistoricoLoading(false)
  }

  const abrirCupom = async (venda) => {
    const dadosEmpresa = await call(window.api.empresa.get())
    setEmpresa(dadosEmpresa || {})
    setCupom(venda)
  }

  const filtrados = produtos.filter((p) =>
    p.descricao.toLowerCase().includes(search.trim().toLowerCase())
  )

  const subtotal = useMemo(
    () => carrinho.reduce((s, i) => s + round2(i.quantidade * i.valor_unitario), 0),
    [carrinho]
  )
  const total = Math.max(0, round2(subtotal - (desconto || 0)))

  const adicionar = (p) => {
    const noCarrinho = carrinho.find((i) => i.produto_id === p.id)
    const qtd = (noCarrinho?.quantidade || 0) + 1
    if (qtd > p.estoque) {
      message.error(`Estoque insuficiente para ${p.descricao}`)
      return
    }
    if (noCarrinho) {
      setCarrinho((c) => c.map((i) => (i.produto_id === p.id ? { ...i, quantidade: qtd } : i)))
    } else {
      setCarrinho((c) => [
        ...c,
        {
          produto_id: p.id,
          descricao: p.descricao,
          estoque: p.estoque,
          quantidade: 1,
          valor_unitario: p.preco_venda
        }
      ])
    }
  }

  const alterarQtd = (id, v) => {
    const item = carrinho.find((i) => i.produto_id === id)
    const qtd = v || 1
    if (qtd > item.estoque) {
      message.error(`Estoque insuficiente para ${item.descricao}`)
      return
    }
    setCarrinho((c) => c.map((i) => (i.produto_id === id ? { ...i, quantidade: qtd } : i)))
  }

  const finalizar = async () => {
    if (!carrinho.length) {
      message.error('O carrinho está vazio')
      return
    }
    setSaving(true)
    const res = await call(
      window.api.pdv.finalizarVenda({
        itens: carrinho.map((i) => ({
          produto_id: i.produto_id,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario
        })),
        desconto: desconto || 0,
        forma_pagamento: pagamento,
        funcionario_id: funcionarioId
      })
    )
    setSaving(false)
    if (res) {
      message.success(`Venda finalizada! Total: ${formatCurrency(res.total)}`)
      setCarrinho([])
      setDesconto(0)
      load()
      setPaginaHistorico(1)
      const vendasAtualizadas = await loadVendas(1, tamanhoPaginaHistorico)
      const venda = vendasAtualizadas?.vendas.find((item) => item.id === res.id)
      if (venda) await abrirCupom(venda)
    }
  }

  const colunas = [
    { title: 'Item', dataIndex: 'descricao' },
    {
      title: 'Qtd.',
      width: 90,
      render: (_, i) => (
        <InputNumber
          min={1}
          size="small"
          value={i.quantidade}
          onChange={(v) => alterarQtd(i.produto_id, v)}
        />
      )
    },
    {
      title: 'Subtotal',
      width: 110,
      render: (_, i) => formatCurrency(round2(i.quantidade * i.valor_unitario))
    },
    {
      title: '',
      width: 40,
      render: (_, i) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => setCarrinho((c) => c.filter((x) => x.produto_id !== i.produto_id))}
        />
      )
    }
  ]

  return (
    <>
      <PageHeader
        title="PDV"
        extra={
          <Button icon={<HistoryOutlined />} onClick={abrirHistorico}>
            Histórico
          </Button>
        }
      />
      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Input.Search
            allowClear
            placeholder="Buscar peça"
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {filtrados.length === 0 ? (
            <Empty description="Nenhum item encontrado" />
          ) : (
            <Row gutter={[12, 12]}>
              {filtrados.map((p) => {
                const semEstoque = p.estoque <= 0
                return (
                  <Col key={p.id} xs={12} md={8}>
                    <Card
                      hoverable={!semEstoque}
                      size="small"
                      onClick={() => !semEstoque && adicionar(p)}
                      style={{ opacity: semEstoque ? 0.5 : 1 }}
                    >
                      <Typography.Text strong>{p.descricao}</Typography.Text>
                      <div>{formatCurrency(p.preco_venda)}</div>
                      <Tag color="blue">Estoque {p.estoque}</Tag>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          )}
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Carrinho">
            <Table
              rowKey="produto_id"
              size="small"
              pagination={false}
              columns={colunas}
              dataSource={carrinho}
              locale={{ emptyText: 'Carrinho vazio' }}
            />
            <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
              <Select
                style={{ width: '100%' }}
                placeholder="Funcionário"
                value={funcionarioId}
                onChange={setFuncionarioId}
                options={funcionarios.map((f) => ({ value: f.id, label: f.nome }))}
              />
              <Select
                style={{ width: '100%' }}
                value={pagamento}
                onChange={setPagamento}
                options={pagamentos}
              />
              <Space>
                Desconto (R$):
                <InputNumber
                  min={0}
                  precision={2}
                  value={desconto}
                  onChange={(v) => setDesconto(v || 0)}
                />
              </Space>
              <Typography.Text>Subtotal: {formatCurrency(subtotal)}</Typography.Text>
              <Typography.Title level={3} style={{ margin: 0 }}>
                Total: {formatCurrency(total)}
              </Typography.Title>
              <Button type="primary" size="large" block loading={saving} onClick={finalizar}>
                Finalizar Venda
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
      <Modal
        title="Histórico de vendas"
        open={historicoAberto}
        onCancel={() => setHistoricoAberto(false)}
        footer={null}
        width={800}
      >
        <Table
          rowKey="id"
          size="small"
          loading={historicoLoading}
          dataSource={vendas}
          pagination={{
            current: paginaHistorico,
            pageSize: tamanhoPaginaHistorico,
            total: totalVendas,
            showSizeChanger: true,
            pageSizeOptions: [8, 20, 50],
            onChange: paginarHistorico
          }}
          scroll={{ x: 640 }}
          columns={[
            { title: 'Venda', dataIndex: 'id', render: (id) => `#${id}` },
            {
              title: 'Data',
              dataIndex: 'data',
              render: (data) => (data ? dayjs(data).format('DD/MM/YYYY HH:mm') : '-')
            },
            { title: 'Funcionário', dataIndex: 'funcionario_nome', render: (nome) => nome || '-' },
            {
              title: 'Pagamento',
              dataIndex: 'forma_pagamento',
              render: rotuloPagamento
            },
            { title: 'Total', dataIndex: 'total', render: formatCurrency },
            {
              title: '',
              key: 'cupom',
              render: (_, venda) => (
                <Button
                  type="link"
                  icon={<PrinterOutlined />}
                  onClick={() => {
                    setHistoricoAberto(false)
                    abrirCupom(venda)
                  }}
                >
                  Cupom
                </Button>
              )
            }
          ]}
        />
      </Modal>
      <Modal
        title={`Cupom da venda #${cupom?.id ?? ''}`}
        open={!!cupom}
        onCancel={() => setCupom(null)}
        footer={
          <Space>
            <Button onClick={() => setCupom(null)}>Fechar</Button>
            <Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
              Imprimir cupom
            </Button>
          </Space>
        }
      >
        {cupom && (
          <div>
            <Typography.Title level={5}>{empresa?.nome || 'Oficina Mecânica'}</Typography.Title>
            <Typography.Paragraph>
              {empresa?.documento && (
                <>
                  CNPJ/CPF: {empresa.documento}
                  <br />
                </>
              )}
              {empresa?.telefone && (
                <>
                  Telefone: {empresa.telefone}
                  <br />
                </>
              )}
              {empresa?.email && (
                <>
                  E-mail: {empresa.email}
                  <br />
                </>
              )}
              {empresa?.endereco && (
                <>
                  Endereço: {empresa.endereco}
                  <br />
                </>
              )}
            </Typography.Paragraph>
            <Typography.Title level={5}>PDV · Venda #{cupom.id}</Typography.Title>
            <Typography.Paragraph>
              Data: {dayjs(cupom.data).format('DD/MM/YYYY HH:mm')}
              <br />
              Funcionário: {cupom.funcionario_nome || '-'}
              <br />
              Pagamento: {rotuloPagamento(cupom.forma_pagamento)}
            </Typography.Paragraph>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={cupom.itens}
              columns={[
                { title: 'Item', dataIndex: 'descricao' },
                { title: 'Qtd.', dataIndex: 'quantidade', width: 60 },
                { title: 'Total', dataIndex: 'valor_total', render: formatCurrency, width: 100 }
              ]}
            />
            <Typography.Paragraph style={{ marginTop: 16, textAlign: 'right' }}>
              Desconto: {formatCurrency(cupom.desconto)}
              <br />
              <Typography.Text strong>Total: {formatCurrency(cupom.total)}</Typography.Text>
            </Typography.Paragraph>
          </div>
        )}
      </Modal>
      {cupom && (
        <div className="pdv-print">
          <header className="pdv-print-header">
            <strong>{empresa?.nome || 'Oficina Mecânica'}</strong>
            <span>#{cupom.id}</span>
          </header>
          {empresa?.documento && <p>CNPJ/CPF: {empresa.documento}</p>}
          {empresa?.telefone && <p>Telefone: {empresa.telefone}</p>}
          {empresa?.email && <p>E-mail: {empresa.email}</p>}
          {empresa?.endereco && <p>Endereço: {empresa.endereco}</p>}
          <p>Cupom de venda</p>
          <p>Data: {dayjs(cupom.data).format('DD/MM/YYYY HH:mm')}</p>
          <p>Funcionário: {cupom.funcionario_nome || '-'}</p>
          <p>Pagamento: {rotuloPagamento(cupom.forma_pagamento)}</p>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qtd.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {cupom.itens.map((item) => (
                <tr key={item.id}>
                  <td>{item.descricao}</td>
                  <td>{item.quantidade}</td>
                  <td>{formatCurrency(item.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="pdv-print-total">Desconto: {formatCurrency(cupom.desconto)}</p>
          <p className="pdv-print-total">Total: {formatCurrency(cupom.total)}</p>
        </div>
      )}
    </>
  )
}
