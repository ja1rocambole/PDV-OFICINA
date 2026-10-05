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
import { DeleteOutlined, EditOutlined, PlusOutlined, SwapOutlined } from '@ant-design/icons'
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
  }

  const openDrawer = async (record) => {
    await loadCadastros()
    form.resetFields()
    if (record) {
      const full = await call(window.api.ordensServico.get(record.id))
      if (!full) return
      setEditing(full)
      form.setFieldsValue(full)
      setItens(full.itens.map((i, idx) => ({ ...i, key: `${i.id}-${idx}` })))
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

  const addItem = () =>
    setItens((l) => [
      ...l,
      {
        key: `n-${Date.now()}-${l.length}`,
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
    patchItem(key, { produto_id: produtoId, descricao: p.descricao, valor_unitario: p.preco_venda })
  }

  const save = async () => {
    const values = await form.validateFields()
    if (!itens.length || itens.some((i) => !i.produto_id)) {
      message.error('Adicione ao menos um item e selecione o produto/serviço em todas as linhas')
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
      width: 140,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openDrawer(r)} />
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

  const itemColumns = [
    {
      title: 'Produto / Serviço',
      render: (_, i) => (
        <Select
          showSearch={{ optionFilterProp: 'label' }}
          style={{ width: '100%' }}
          placeholder="Selecione"
          value={i.produto_id}
          onChange={(v) => selectProduto(i.key, v)}
          options={produtos.map((p) => ({
            value: p.id,
            label: `${p.descricao} (${p.tipo === 'peca' ? 'Peça' : 'Serviço'})`
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
        <Table
          rowKey="key"
          size="small"
          pagination={false}
          columns={itemColumns}
          dataSource={itens}
          footer={() => (
            <Button type="dashed" icon={<PlusOutlined />} onClick={addItem} block>
              Adicionar item
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
    </>
  )
}
