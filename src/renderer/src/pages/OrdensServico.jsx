import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Col,
  Divider,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Typography,
  message
} from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  PrinterOutlined,
  SwapOutlined
} from '@ant-design/icons'
import { Popconfirm } from 'antd'
import PageHeader from '../components/PageHeader'
import StatusTag from '../components/StatusTag'
import { STATUS_OS } from '../utils/status'
import { call } from '../utils/api'
import { formatCurrency, formatDate, round2 } from '../utils/format'

const statusOptions = Object.entries(STATUS_OS).map(([value, { label }]) => ({ value, label }))
const discountOptions = [
  { value: 'valor', label: 'Valor fixo' },
  { value: 'percentual', label: 'Percentual' }
]

function categorySubtotals(items) {
  return items.reduce(
    (subtotals, item) => {
      const category = item.tipo === 'servico' ? 'servico' : 'peca'
      subtotals[category] += round2((item.quantidade || 0) * (item.valor_unitario || 0))
      return subtotals
    },
    { peca: 0, servico: 0 }
  )
}

function amountAfterDiscount(subtotal, discount) {
  const value = Math.max(0, Number(discount.valor) || 0)
  const amount = discount.tipo === 'percentual' ? (subtotal * Math.min(value, 100)) / 100 : value
  return Math.min(subtotal, round2(amount))
}

function discountsFromOrder(order, items) {
  if (order.desconto_pecas != null || order.desconto_servicos != null) {
    return {
      peca: {
        valor: Number(order.desconto_pecas) || 0,
        tipo: order.desconto_pecas_tipo || 'valor'
      },
      servico: {
        valor: Number(order.desconto_servicos) || 0,
        tipo: order.desconto_servicos_tipo || 'valor'
      }
    }
  }

  const subtotals = categorySubtotals(items)
  const totalSubtotal = subtotals.peca + subtotals.servico
  const oldDiscount = Math.min(totalSubtotal, Number(order.desconto) || 0)
  const pecasValor = totalSubtotal
    ? Math.min(subtotals.peca, round2((oldDiscount * subtotals.peca) / totalSubtotal))
    : 0
  return {
    peca: { valor: pecasValor, tipo: 'valor' },
    servico: { valor: Math.min(subtotals.servico, oldDiscount - pecasValor), tipo: 'valor' }
  }
}

export default function OrdensServico() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState()
  const [search, setSearch] = useState('')
  const [clientes, setClientes] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [produtos, setProdutos] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [itens, setItens] = useState([])
  const [descontos, setDescontos] = useState({
    peca: { valor: 0, tipo: 'valor' },
    servico: { valor: 0, tipo: 'valor' }
  })
  const [saving, setSaving] = useState(false)
  const [printOs, setPrintOs] = useState(null)
  const [form] = Form.useForm()
  const clienteId = Form.useWatch('cliente_id', form)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await call(window.api.ordensServico.list({ status: statusFilter, search }))
    if (data) setRows(data)
    setLoading(false)
  }, [statusFilter, search])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const loadCadastros = async () => {
    const [c, v, f, p] = await Promise.all([
      call(window.api.clientes.list('')),
      call(window.api.veiculos.list('')),
      call(window.api.funcionarios.list('')),
      call(window.api.produtos.list(''))
    ])
    if (c) setClientes(c)
    if (v) setVeiculos(v)
    if (f) setFuncionarios(f.filter((x) => x.ativo))
    if (p) setProdutos(p)
    return p || []
  }

  const openDrawer = async (record) => {
    const catalogoProdutos = await loadCadastros()
    form.resetFields()
    if (record) {
      const full = await call(window.api.ordensServico.get(record.id))
      if (!full) return
      setEditing(full)
      form.setFieldsValue(full)
      const itensCarregados = full.itens.map((i, idx) => ({
        ...i,
        tipo: catalogoProdutos.find((p) => p.id === i.produto_id)?.tipo || i.tipo || 'peca',
        avulso: !i.produto_id,
        key: `${i.id}-${idx}`
      }))
      setItens(itensCarregados)
      setDescontos(discountsFromOrder(full, itensCarregados))
    } else {
      setEditing(null)
      setItens([])
      setDescontos({
        peca: { valor: 0, tipo: 'valor' },
        servico: { valor: 0, tipo: 'valor' }
      })
      form.setFieldsValue({ status: 'aberta' })
    }
    setOpen(true)
  }

  const subtotais = useMemo(() => categorySubtotals(itens), [itens])
  const descontosAplicados = {
    peca: amountAfterDiscount(subtotais.peca, descontos.peca),
    servico: amountAfterDiscount(subtotais.servico, descontos.servico)
  }
  const subtotal = subtotais.peca + subtotais.servico
  const total = Math.max(0, round2(subtotal - descontosAplicados.peca - descontosAplicados.servico))

  const veiculosDoCliente = veiculos.filter((v) => v.cliente_id === clienteId)

  const addItem = (tipo) =>
    setItens((l) => [
      ...l,
      {
        key: `n-${Date.now()}-${l.length}`,
        tipo,
        produto_id: null,
        descricao: '',
        quantidade: 1,
        valor_unitario: 0
      }
    ])
  const addAdHocItem = (tipo) =>
    setItens((l) => [
      ...l,
      {
        key: `a-${Date.now()}-${l.length}`,
        tipo,
        avulso: true,
        produto_id: null,
        descricao: '',
        quantidade: 1,
        valor_unitario: 0
      }
    ])
  const patchItem = (key, patch) =>
    setItens((l) => l.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  const patchDesconto = (categoria, patch) =>
    setDescontos((current) => ({
      ...current,
      [categoria]: { ...current[categoria], ...patch }
    }))
  const changeDiscountMode = (categoria, tipo) => {
    const subtotalCategoria = subtotais[categoria]
    const descontoAtual = amountAfterDiscount(subtotalCategoria, descontos[categoria])
    const valor =
      tipo === 'percentual'
        ? subtotalCategoria
          ? round2((descontoAtual / subtotalCategoria) * 100)
          : 0
        : descontoAtual
    patchDesconto(categoria, { tipo, valor })
  }
  const selectProduto = (key, produtoId) => {
    const p = produtos.find((x) => x.id === produtoId)
    patchItem(key, {
      tipo: p.tipo,
      avulso: false,
      produto_id: produtoId,
      descricao: p.descricao,
      valor_unitario: p.preco_venda
    })
  }

  const printOrder = async (record) => {
    const catalogoProdutos = await loadCadastros()
    const full = await call(window.api.ordensServico.get(record.id))
    if (!full) return
    const itensImpressao = full.itens.map((item) => ({
      ...item,
      tipo: catalogoProdutos.find((p) => p.id === item.produto_id)?.tipo || item.tipo || 'peca'
    }))
    const descontosImpressao = discountsFromOrder(full, itensImpressao)
    const subtotaisImpressao = categorySubtotals(itensImpressao)
    setPrintOs({
      ...full,
      itens: itensImpressao,
      descontos_impressao: descontosImpressao,
      desconto_pecas_aplicado: amountAfterDiscount(
        subtotaisImpressao.peca,
        descontosImpressao.peca
      ),
      desconto_servicos_aplicado: amountAfterDiscount(
        subtotaisImpressao.servico,
        descontosImpressao.servico
      ),
      subtotal_pecas_impressao: subtotaisImpressao.peca,
      subtotal_servicos_impressao: subtotaisImpressao.servico,
      total_liquido_impressao: Math.max(
        0,
        round2(
          subtotaisImpressao.peca +
            subtotaisImpressao.servico -
            amountAfterDiscount(subtotaisImpressao.peca, descontosImpressao.peca) -
            amountAfterDiscount(subtotaisImpressao.servico, descontosImpressao.servico)
        )
      )
    })
  }

  useEffect(() => {
    if (!printOs) return undefined
    const finishPrint = () => setPrintOs(null)
    window.addEventListener('afterprint', finishPrint)
    window.print()
    return () => window.removeEventListener('afterprint', finishPrint)
  }, [printOs])

  const save = async () => {
    const values = await form.validateFields()
    if (!itens.length || itens.some((i) => !i.tipo || (!i.produto_id && !i.descricao.trim()))) {
      message.error('Selecione os itens do catálogo ou informe a descrição dos itens avulsos')
      return
    }
    setSaving(true)
    const payload = {
      ...values,
      desconto: descontosAplicados.peca + descontosAplicados.servico,
      desconto_pecas: descontos.peca.valor,
      desconto_pecas_tipo: descontos.peca.tipo,
      desconto_servicos: descontos.servico.valor,
      desconto_servicos_tipo: descontos.servico.tipo,
      itens
    }
    const res = editing
      ? await call(window.api.ordensServico.update(editing.id, payload))
      : await call(window.api.ordensServico.create(payload))
    setSaving(false)
    if (res) {
      message.success('Ordem de serviço salva com sucesso')
      setOpen(false)
      load()
    }
  }

  const changeStatus = async (record, status) => {
    const res = await call(window.api.ordensServico.updateStatus(record.id, status))
    if (res) {
      message.success('Status atualizado')
      load()
    }
  }

  const remove = async (record) => {
    const res = await call(window.api.ordensServico.remove(record.id))
    if (res) {
      message.success('Ordem de serviço excluída')
      load()
    }
  }

  const columns = [
    { title: 'Nº', dataIndex: 'numero', width: 80 },
    { title: 'Cliente', dataIndex: 'cliente_nome' },
    {
      title: 'Veículo',
      render: (_, r) => [r.veiculo_placa, r.veiculo_modelo].filter(Boolean).join(' - ')
    },
    { title: 'Responsável', dataIndex: 'funcionario_nome' },
    { title: 'Abertura', dataIndex: 'data_abertura', render: formatDate },
    { title: 'Fechamento', dataIndex: 'data_fechamento', render: formatDate },
    { title: 'Status', dataIndex: 'status', render: (s) => <StatusTag status={s} /> },
    { title: 'Total', dataIndex: 'total', render: formatCurrency },
    {
      title: 'Ações',
      width: 180,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openDrawer(r)} />
          <Button
            size="small"
            icon={<PrinterOutlined />}
            title="Imprimir OS em A4"
            onClick={() => printOrder(r)}
          />
          <Dropdown
            menu={{
              items: statusOptions.map((o) => ({ key: o.value, label: o.label })),
              selectedKeys: [r.status],
              onClick: ({ key }) => changeStatus(r, key)
            }}
          >
            <Button size="small" icon={<SwapOutlined />} title="Mudar status" />
          </Dropdown>
          <Popconfirm
            title="Excluir ordem de serviço?"
            okText="Sim"
            cancelText="Não"
            onConfirm={() => remove(r)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const itemColumns = (tipo) => [
    {
      title: tipo === 'peca' ? 'Produto / Peça' : 'Serviço',
      render: (_, i) =>
        i.avulso ? (
          <Input
            value={i.descricao}
            placeholder={tipo === 'peca' ? 'Descrição da peça' : 'Descrição do serviço'}
            onChange={(event) => patchItem(i.key, { descricao: event.target.value })}
          />
        ) : (
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: '100%' }}
            placeholder="Selecione"
            value={i.produto_id}
            onChange={(v) => selectProduto(i.key, v)}
            options={produtos
              .filter((p) => p.tipo === tipo)
              .map((p) => ({
                value: p.id,
                label: p.descricao
              }))}
          />
        )
    },
    {
      title: 'Qtd.',
      width: 100,
      render: (_, i) => (
        <InputNumber
          min={1}
          value={i.quantidade}
          onChange={(v) => patchItem(i.key, { quantidade: v || 1 })}
        />
      )
    },
    {
      title: 'Valor unit.',
      width: 140,
      render: (_, i) => (
        <InputNumber
          min={0}
          precision={2}
          value={i.valor_unitario}
          onChange={(v) => patchItem(i.key, { valor_unitario: v || 0 })}
        />
      )
    },
    {
      title: 'Total',
      width: 120,
      render: (_, i) => formatCurrency(round2(i.quantidade * i.valor_unitario))
    },
    {
      title: '',
      width: 50,
      render: (_, i) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => setItens((l) => l.filter((x) => x.key !== i.key))}
        />
      )
    }
  ]

  return (
    <>
      <PageHeader
        title="Ordem de Serviços"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer(null)}>
            Nova OS
          </Button>
        }
      />
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          allowClear
          placeholder="Buscar por número ou cliente"
          style={{ width: 320 }}
          onSearch={setSearch}
        />
        <Select
          allowClear
          placeholder="Filtrar por status"
          style={{ width: 220 }}
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </Space>
      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />
      <Drawer
        title={editing ? `Editar OS nº ${editing.numero}` : 'Nova Ordem de Serviço'}
        size="large"
        open={open}
        onClose={() => setOpen(false)}
        destroyOnHidden
        forceRender
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={save}>
              Salvar
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cliente_id"
                label="Cliente"
                rules={[{ required: true, message: 'Selecione o cliente' }]}
              >
                <Select
                  showSearch={{ optionFilterProp: 'label' }}
                  placeholder="Selecione"
                  options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                  onChange={() => form.setFieldValue('veiculo_id', undefined)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="veiculo_id"
                label="Veículo"
                rules={[{ required: true, message: 'Selecione o veículo' }]}
              >
                <Select
                  showSearch={{ optionFilterProp: 'label' }}
                  disabled={!clienteId}
                  placeholder={clienteId ? 'Selecione' : 'Selecione um cliente primeiro'}
                  options={veiculosDoCliente.map((v) => ({
                    value: v.id,
                    label: `${v.placa} - ${v.modelo ?? ''}`
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="funcionario_id"
                label="Responsável"
                rules={[{ required: true, message: 'Selecione o responsável' }]}
              >
                <Select
                  showSearch={{ optionFilterProp: 'label' }}
                  placeholder="Selecione"
                  options={funcionarios.map((f) => ({ value: f.id, label: f.nome }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status">
                <Select options={statusOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="observacoes" label="Observações">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
        <Divider>Itens</Divider>
        <Divider>Produtos e peças</Divider>
        <Table
          rowKey="key"
          size="small"
          pagination={false}
          columns={itemColumns('peca')}
          dataSource={itens.filter((item) => item.tipo === 'peca')}
          footer={() => (
            <Space style={{ display: 'flex', width: '100%' }}>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => addItem('peca')}
                style={{ flex: 1 }}
              >
                Adicionar produto ou peça
              </Button>
              <Button icon={<PlusOutlined />} onClick={() => addAdHocItem('peca')}>
                Avulso
              </Button>
            </Space>
          )}
        />
        <Divider>Serviços</Divider>
        <Table
          rowKey="key"
          size="small"
          pagination={false}
          columns={itemColumns('servico')}
          dataSource={itens.filter((item) => item.tipo === 'servico')}
          footer={() => (
            <Space style={{ display: 'flex', width: '100%' }}>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => addItem('servico')}
                style={{ flex: 1 }}
              >
                Adicionar serviço
              </Button>
              <Button icon={<PlusOutlined />} onClick={() => addAdHocItem('servico')}>
                Avulso
              </Button>
            </Space>
          )}
        />
        <Divider>Descontos por categoria</Divider>
        <Row gutter={[16, 12]}>
          {[
            ['peca', 'Produtos e peças'],
            ['servico', 'Serviços']
          ].map(([categoria, label]) => (
            <Col span={12} key={categoria}>
              <Typography.Text strong>{label}</Typography.Text>
              <Space wrap style={{ width: '100%', marginTop: 8 }}>
                <Select
                  value={descontos[categoria].tipo}
                  options={discountOptions}
                  style={{ width: 130 }}
                  onChange={(tipo) => changeDiscountMode(categoria, tipo)}
                />
                <InputNumber
                  min={0}
                  max={descontos[categoria].tipo === 'percentual' ? 100 : subtotais[categoria]}
                  precision={2}
                  value={descontos[categoria].valor}
                  style={{ width: 130 }}
                  onChange={(valor) => patchDesconto(categoria, { valor: valor || 0 })}
                />
                <Typography.Text>
                  {descontos[categoria].tipo === 'percentual' ? '%' : 'R$'}
                </Typography.Text>
              </Space>
              <div>
                <Typography.Text type="secondary">
                  Desconto aplicado: {formatCurrency(descontosAplicados[categoria])}
                </Typography.Text>
              </div>
            </Col>
          ))}
        </Row>
        <Space direction="vertical" align="end" style={{ width: '100%', marginTop: 16 }}>
          <Typography.Text>
            Subtotal de produtos e peças: {formatCurrency(subtotais.peca)}
          </Typography.Text>
          <Typography.Text>
            Subtotal de serviços: {formatCurrency(subtotais.servico)}
          </Typography.Text>
          <Typography.Text>Subtotal geral: {formatCurrency(subtotal)}</Typography.Text>
          <Typography.Text>
            Desconto: {formatCurrency(descontosAplicados.peca + descontosAplicados.servico)}
          </Typography.Text>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Total: {formatCurrency(total)}
          </Typography.Title>
        </Space>
      </Drawer>
      {printOs && (
        <article className="os-print">
          <header className="os-print-header">
            <div>
              <div className="os-print-brand">Oficina Mecânica</div>
              <div className="os-print-caption">ORDEM DE SERVIÇO</div>
            </div>
            <div className="os-print-number">Nº {printOs.numero}</div>
          </header>
          <section className="os-print-section">
            <h2>Dados da ordem</h2>
            <div className="os-print-grid">
              <div>
                <strong>Abertura:</strong> {formatDate(printOs.data_abertura)}
              </div>
              <div>
                <strong>Fechamento:</strong> {formatDate(printOs.data_fechamento)}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                {statusOptions.find((option) => option.value === printOs.status)?.label ||
                  printOs.status}
              </div>
              <div>
                <strong>Responsável:</strong> {printOs.funcionario_nome || '-'}
              </div>
            </div>
          </section>
          <section className="os-print-section">
            <h2>Cliente e veículo</h2>
            <div className="os-print-grid">
              <div>
                <strong>Cliente:</strong> {printOs.cliente_nome || '-'}
              </div>
              <div>
                <strong>Placa:</strong> {printOs.veiculo_placa || '-'}
              </div>
              <div className="os-print-wide">
                <strong>Veículo:</strong> {printOs.veiculo_modelo || '-'}
              </div>
            </div>
          </section>
          {['peca', 'servico'].map((tipo) => {
            const itensDoTipo = printOs.itens.filter((item) => item.tipo === tipo)
            return (
              <section className="os-print-section" key={tipo}>
                <h2>{tipo === 'peca' ? 'Produtos e peças' : 'Serviços'}</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Qtd.</th>
                      <th>Valor unitário</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensDoTipo.length ? (
                      itensDoTipo.map((item) => (
                        <tr key={item.id}>
                          <td>{item.descricao}</td>
                          <td>{item.quantidade}</td>
                          <td>{formatCurrency(item.valor_unitario)}</td>
                          <td>{formatCurrency(item.valor_total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4">Nenhum item</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
            )
          })}
          {printOs.observacoes && (
            <section className="os-print-section">
              <h2>Observações</h2>
              <p>{printOs.observacoes}</p>
            </section>
          )}
          <section className="os-print-totals">
            <div>
              <strong>Subtotal:</strong>{' '}
              {formatCurrency(printOs.itens.reduce((sum, item) => sum + item.valor_total, 0))}
            </div>
            <div>
              <strong>Desconto em produtos e peças:</strong> -
              {formatCurrency(printOs.desconto_pecas_aplicado)}
              {printOs.descontos_impressao.peca.tipo === 'percentual' &&
                ` (${printOs.descontos_impressao.peca.valor}%)`}
            </div>
            <div>
              <strong>Desconto em serviços:</strong> -
              {formatCurrency(printOs.desconto_servicos_aplicado)}
              {printOs.descontos_impressao.servico.tipo === 'percentual' &&
                ` (${printOs.descontos_impressao.servico.valor}%)`}
            </div>
            <div className="os-print-total">
              <strong>Total líquido:</strong> {formatCurrency(printOs.total_liquido_impressao)}
            </div>
          </section>
          <footer className="os-print-signatures">
            <div>Assinatura do cliente</div>
            <div>Assinatura do responsável</div>
          </footer>
        </article>
      )}
    </>
  )
}
