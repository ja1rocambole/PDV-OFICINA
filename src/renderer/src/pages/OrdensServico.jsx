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
  const [desconto, setDesconto] = useState(0)
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
      setItens(
        full.itens.map((i, idx) => ({
          ...i,
          tipo: catalogoProdutos.find((p) => p.id === i.produto_id)?.tipo || 'peca',
          key: `${i.id}-${idx}`
        }))
      )
      setDesconto(full.desconto || 0)
    } else {
      setEditing(null)
      setItens([])
      setDesconto(0)
      form.setFieldsValue({ status: 'aberta' })
    }
    setOpen(true)
  }

  const subtotal = useMemo(
    () => itens.reduce((s, i) => s + round2((i.quantidade || 0) * (i.valor_unitario || 0)), 0),
    [itens]
  )
  const total = Math.max(0, round2(subtotal - (desconto || 0)))

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
  const patchItem = (key, patch) =>
    setItens((l) => l.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  const selectProduto = (key, produtoId) => {
    const p = produtos.find((x) => x.id === produtoId)
    patchItem(key, {
      tipo: p.tipo,
      produto_id: produtoId,
      descricao: p.descricao,
      valor_unitario: p.preco_venda
    })
  }

  const printOrder = async (record) => {
    const catalogoProdutos = await loadCadastros()
    const full = await call(window.api.ordensServico.get(record.id))
    if (!full) return
    setPrintOs({
      ...full,
      itens: full.itens.map((item) => ({
        ...item,
        tipo: catalogoProdutos.find((p) => p.id === item.produto_id)?.tipo || 'peca'
      }))
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
    if (!itens.length || itens.some((i) => !i.produto_id)) {
      message.error('Adicione ao menos um produto ou serviço e selecione todos os itens')
      return
    }
    setSaving(true)
    const payload = { ...values, desconto: desconto || 0, itens }
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
      render: (_, i) => (
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
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => addItem('peca')} block>
              Adicionar produto ou peça
            </Button>
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
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => addItem('servico')} block>
              Adicionar serviço
            </Button>
          )}
        />
        <Space direction="vertical" align="end" style={{ width: '100%', marginTop: 16 }}>
          <Typography.Text>Subtotal: {formatCurrency(subtotal)}</Typography.Text>
          <Space>
            Desconto (R$):
            <InputNumber
              min={0}
              precision={2}
              value={desconto}
              onChange={(v) => setDesconto(v || 0)}
            />
          </Space>
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
              <strong>Desconto:</strong> {formatCurrency(printOs.desconto)}
            </div>
            <div className="os-print-total">
              <strong>Total:</strong> {formatCurrency(printOs.total)}
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
