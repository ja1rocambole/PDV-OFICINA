/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  message
} from 'antd'

const statuses = [
  ['ORCAMENTO', 'Orçamento'],
  ['APROVADO', 'Aprovada'],
  ['EM_ANDAMENTO', 'Em andamento'],
  ['AGUARDANDO_PECA', 'Aguardando peça'],
  ['CONCLUIDO', 'Concluída'],
  ['CANCELADO', 'Cancelada']
]
const editableStatuses = ['ORCAMENTO', 'APROVADO', 'EM_ANDAMENTO', 'AGUARDANDO_PECA']
const money = (value) =>
  `R$ ${Number(value || 0)
    .toFixed(2)
    .replace('.', ',')}`
const statusLabel = (value) => statuses.find(([key]) => key === value)?.[1] || value

function ServiceOrders() {
  const [orders, setOrders] = useState([])
  const [clients, setClients] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [employees, setEmployees] = useState([])
  const [products, setProducts] = useState([])
  const [filters, setFilters] = useState({ search: '', status: null })
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const clientId = Form.useWatch('client_id', form)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [orderList, clientList, vehicleList, employeeList, productList] = await Promise.all([
        window.api.serviceOrders.list(filters),
        window.api.clients.list(),
        window.api.vehicles.list(),
        window.api.employees.list({ active: '1' }),
        window.api.products.list()
      ])
      setOrders(orderList)
      setClients(clientList)
      setVehicles(vehicleList)
      setEmployees(employeeList)
      setProducts(productList)
    } catch (error) {
      message.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void Promise.resolve().then(loadData)
  }, [loadData])

  async function openDetail(order) {
    try {
      setDetail(await window.api.serviceOrders.get(order.id))
    } catch (error) {
      message.error(error.message)
    }
  }

  function openModal(order = null) {
    setEditing(order)
    form.setFieldsValue(
      order || { client_id: undefined, vehicle_id: undefined, employee_id: undefined, discount: 0 }
    )
    setModalOpen(true)
  }

  async function save(values) {
    try {
      if (editing) await window.api.serviceOrders.update(editing.id, values)
      else await window.api.serviceOrders.create(values)
      message.success(editing ? 'Ordem atualizada' : 'Ordem criada')
      setModalOpen(false)
      await loadData()
    } catch (error) {
      message.error(error.message)
    }
  }

  async function changeStatus(order, status) {
    try {
      await window.api.serviceOrders.updateStatus(order.id, status)
      message.success('Status atualizado')
      await loadData()
      if (detail?.id === order.id) await openDetail(order)
    } catch (error) {
      message.error(error.message)
    }
  }

  async function remove(order) {
    try {
      await window.api.serviceOrders.delete(order.id)
      message.success('Ordem excluída')
      setDetail(null)
      await loadData()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Número', dataIndex: 'id', key: 'id' },
    { title: 'Cliente', dataIndex: 'client_name', key: 'client_name' },
    { title: 'Veículo', key: 'vehicle', render: (_, order) => `${order.plate} - ${order.model}` },
    {
      title: 'Data',
      dataIndex: 'created_at',
      render: (value) => new Date(value).toLocaleString('pt-BR')
    },
    { title: 'Total', dataIndex: 'total_amount', render: money },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value) => (
        <Tag color={value === 'CANCELADO' ? 'red' : value === 'CONCLUIDO' ? 'green' : 'blue'}>
          {statusLabel(value)}
        </Tag>
      )
    },
    {
      title: 'Ações',
      render: (_, order) => (
        <Space>
          <Button onClick={() => openDetail(order)}>Detalhes</Button>
          {editableStatuses.includes(order.status) && (
            <Button onClick={() => openModal(order)}>Editar</Button>
          )}
          {order.status === 'ORCAMENTO' && (
            <Popconfirm
              title="Excluir esta ordem?"
              onConfirm={() => remove(order)}
              okText="Excluir"
              cancelText="Cancelar"
            >
              <Button danger>Excluir</Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  const filteredVehicles = useMemo(
    () => vehicles.filter((vehicle) => !clientId || vehicle.client_id === clientId),
    [vehicles, clientId]
  )

  return (
    <>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space wrap>
          <Input.Search
            placeholder="Buscar por número, cliente, veículo ou placa"
            allowClear
            onSearch={(search) => setFilters((current) => ({ ...current, search }))}
            style={{ width: 320 }}
          />
          <DatePicker.RangePicker
            onChange={(dates) =>
              setFilters((current) => ({
                ...current,
                from: dates?.[0]?.format('YYYY-MM-DD') || null,
                to: dates?.[1]?.format('YYYY-MM-DD') || null
              }))
            }
            placeholder={['De', 'Até']}
          />
          <Select
            allowClear
            placeholder="Status"
            onChange={(status) => setFilters((current) => ({ ...current, status }))}
            options={statuses.map(([value, label]) => ({ value, label }))}
          />
          <Button type="primary" onClick={() => openModal()}>
            Nova ordem
          </Button>
        </Space>
        <Table rowKey="id" columns={columns} dataSource={orders} loading={loading} />
      </Space>

      <Modal
        title={editing ? `Editar ordem #${editing.id}` : 'Nova ordem'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Salvar"
        cancelText="Cancelar"
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="client_id"
                label="Cliente"
                rules={[{ required: true, message: 'Selecione o cliente' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={clients.map((item) => ({ value: item.id, label: item.name }))}
                  onChange={() => form.setFieldValue('vehicle_id', undefined)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="vehicle_id"
                label="Veículo"
                rules={[{ required: true, message: 'Selecione o veículo' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={filteredVehicles.map((item) => ({
                    value: item.id,
                    label: `${item.plate} - ${item.brand} ${item.model}`
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="employee_id" label="Funcionário responsável">
            <Select
              allowClear
              options={employees.map((item) => ({ value: item.id, label: item.name }))}
            />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="Status">
              <Select options={statuses.map(([value, label]) => ({ value, label }))} />
            </Form.Item>
          )}
          <Form.Item name="problem_description" label="Descrição do problema">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="notes" label="Observações">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="discount" label="Desconto">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {detail && (
        <OrderDetail
          order={detail}
          products={products}
          employees={employees}
          onClose={() => setDetail(null)}
          onRefresh={() => openDetail(detail)}
          onStatusChange={changeStatus}
        />
      )}
    </>
  )
}

function OrderDetail({ order, products, employees, onClose, onRefresh, onStatusChange }) {
  const editable = editableStatuses.includes(order.status)
  const [itemModal, setItemModal] = useState(false)
  const [serviceModal, setServiceModal] = useState(false)
  const [itemForm] = Form.useForm()
  const [serviceForm] = Form.useForm()

  async function addItem(values) {
    try {
      await window.api.osItems.create({ ...values, os_id: order.id })
      message.success('Produto adicionado')
      setItemModal(false)
      await onRefresh()
    } catch (error) {
      message.error(error.message)
    }
  }

  async function addService(values) {
    try {
      await window.api.osServices.create({ ...values, os_id: order.id })
      message.success('Serviço adicionado')
      setServiceModal(false)
      await onRefresh()
    } catch (error) {
      message.error(error.message)
    }
  }

  async function removeItem(id, service = false) {
    try {
      await (service ? window.api.osServices.delete(id) : window.api.osItems.delete(id))
      await onRefresh()
    } catch (error) {
      message.error(error.message)
    }
  }

  return (
    <Modal
      title={`Ordem de serviço #${order.id}`}
      open
      onCancel={onClose}
      footer={null}
      width={900}
    >
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Cliente">{order.client_name}</Descriptions.Item>
        <Descriptions.Item label="Veículo">
          {order.plate} - {order.brand} {order.model}
        </Descriptions.Item>
        <Descriptions.Item label="Responsável">
          {order.employee_name || 'Não definido'}
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag>{statusLabel(order.status)}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Descrição" span={2}>
          {order.problem_description || '-'}
        </Descriptions.Item>
      </Descriptions>
      <Card
        title="Produtos utilizados"
        size="small"
        style={{ marginTop: 16 }}
        extra={editable && <Button onClick={() => setItemModal(true)}>Adicionar produto</Button>}
      >
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={order.items}
          columns={[
            { title: 'Produto', dataIndex: 'product_name' },
            { title: 'Qtd.', dataIndex: 'quantity' },
            { title: 'Unitário', dataIndex: 'unit_price', render: money },
            { title: 'Subtotal', dataIndex: 'subtotal', render: money },
            {
              title: 'Ações',
              render: (_, item) =>
                editable && (
                  <Button danger onClick={() => removeItem(item.id)}>
                    Remover
                  </Button>
                )
            }
          ]}
        />
      </Card>
      <Card
        title="Serviços realizados"
        size="small"
        style={{ marginTop: 16 }}
        extra={editable && <Button onClick={() => setServiceModal(true)}>Adicionar serviço</Button>}
      >
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={order.services}
          columns={[
            { title: 'Descrição', dataIndex: 'description' },
            { title: 'Qtd.', dataIndex: 'quantity' },
            { title: 'Valor', dataIndex: 'price', render: money },
            { title: 'Total', dataIndex: 'total', render: money },
            {
              title: 'Ações',
              render: (_, item) =>
                editable && (
                  <Button danger onClick={() => removeItem(item.id, true)}>
                    Remover
                  </Button>
                )
            }
          ]}
        />
      </Card>
      <Card size="small" style={{ marginTop: 16 }}>
        <Descriptions column={4}>
          <Descriptions.Item label="Produtos">{money(order.total_parts)}</Descriptions.Item>
          <Descriptions.Item label="Serviços">{money(order.total_services)}</Descriptions.Item>
          <Descriptions.Item label="Desconto">{money(order.discount)}</Descriptions.Item>
          <Descriptions.Item label="Total">
            <strong>{money(order.total_amount)}</strong>
          </Descriptions.Item>
        </Descriptions>
        <Space wrap>
          <Select
            value={order.status}
            disabled={!editable}
            onChange={(status) => onStatusChange(order, status)}
            options={statuses.map(([value, label]) => ({ value, label }))}
          />
        </Space>
      </Card>
      <Modal
        title="Adicionar produto"
        open={itemModal}
        onCancel={() => setItemModal(false)}
        onOk={() => itemForm.submit()}
        okText="Adicionar"
        cancelText="Cancelar"
      >
        <Form form={itemForm} layout="vertical" onFinish={addItem}>
          <Form.Item
            name="product_id"
            label="Produto"
            rules={[{ required: true, message: 'Selecione o produto' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={products.map((item) => ({
                value: item.id,
                label: `${item.name} (${money(item.selling_price)})`
              }))}
            />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Quantidade"
            initialValue={1}
            rules={[{ required: true }]}
          >
            <InputNumber min={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="discount" label="Desconto" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Adicionar serviço"
        open={serviceModal}
        onCancel={() => setServiceModal(false)}
        onOk={() => serviceForm.submit()}
        okText="Adicionar"
        cancelText="Cancelar"
      >
        <Form form={serviceForm} layout="vertical" onFinish={addService}>
          <Form.Item
            name="description"
            label="Descrição"
            rules={[{ required: true, message: 'Informe a descrição' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="employee_id" label="Funcionário">
            <Select
              allowClear
              options={employees.map((item) => ({ value: item.id, label: item.name }))}
            />
          </Form.Item>
          <Form.Item name="quantity" label="Quantidade" initialValue={1}>
            <InputNumber min={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="price"
            label="Valor"
            rules={[{ required: true, message: 'Informe o valor' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="discount" label="Desconto" initialValue={0}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  )
}

export default ServiceOrders
