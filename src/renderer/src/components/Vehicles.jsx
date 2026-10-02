import { useEffect, useState } from 'react'
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  message
} from 'antd'

const emptyVehicle = {
  client_id: undefined,
  plate: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  current_km: null
}

function Vehicles() {
  const [vehicles, setVehicles] = useState([])
  const [clients, setClients] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [form] = Form.useForm()

  async function loadData() {
    setIsLoading(true)
    try {
      const [vehicleList, clientList] = await Promise.all([
        window.api.vehicles.list(),
        window.api.clients.list()
      ])
      setVehicles(vehicleList)
      setClients(clientList)
    } catch (error) {
      message.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadData)
  }, [])

  function openCreateModal() {
    setEditingVehicle(null)
    form.setFieldsValue(emptyVehicle)
    setIsModalOpen(true)
  }

  function openEditModal(vehicle) {
    setEditingVehicle(vehicle)
    form.setFieldsValue(vehicle)
    setIsModalOpen(true)
  }

  async function saveVehicle(values) {
    try {
      if (editingVehicle) {
        await window.api.vehicles.update(editingVehicle.id, values)
        message.success('Veículo atualizado')
      } else {
        await window.api.vehicles.create(values)
        message.success('Veículo cadastrado')
      }
      setIsModalOpen(false)
      await loadData()
    } catch (error) {
      message.error(error.message)
    }
  }

  async function deleteVehicle(id) {
    try {
      await window.api.vehicles.delete(id)
      message.success('Veículo excluído')
      await loadData()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Placa', dataIndex: 'plate', key: 'plate' },
    { title: 'Cliente', dataIndex: 'client_name', key: 'client_name' },
    { title: 'Marca', dataIndex: 'brand', key: 'brand' },
    { title: 'Modelo', dataIndex: 'model', key: 'model' },
    { title: 'Ano', dataIndex: 'year', key: 'year' },
    { title: 'Cor', dataIndex: 'color', key: 'color' },
    { title: 'Quilometragem', dataIndex: 'current_km', key: 'current_km' },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, vehicle) => (
        <Space>
          <Button onClick={() => openEditModal(vehicle)}>Editar</Button>
          <Popconfirm
            title="Excluir este veículo?"
            description="Essa ação não poderá ser desfeita."
            onConfirm={() => deleteVehicle(vehicle.id)}
            okText="Excluir"
            cancelText="Cancelar"
          >
            <Button danger>Excluir</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Button type="primary" onClick={openCreateModal}>
          Novo veículo
        </Button>
        <Table rowKey="id" columns={columns} dataSource={vehicles} loading={isLoading} />
      </Space>

      <Modal
        title={editingVehicle ? 'Editar veículo' : 'Novo veículo'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        okText="Salvar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" onFinish={saveVehicle} initialValues={emptyVehicle}>
          <Form.Item
            name="client_id"
            label="Cliente"
            rules={[{ required: true, message: 'Selecione o cliente' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Selecione o cliente"
              options={clients.map((client) => ({ value: client.id, label: client.name }))}
            />
          </Form.Item>
          <Form.Item
            name="plate"
            label="Placa"
            rules={[{ required: true, message: 'Informe a placa' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="brand"
            label="Marca"
            rules={[{ required: true, message: 'Informe a marca' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="model"
            label="Modelo"
            rules={[{ required: true, message: 'Informe o modelo' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="year" label="Ano">
            <Input />
          </Form.Item>
          <Form.Item name="color" label="Cor">
            <Input />
          </Form.Item>
          <Form.Item name="current_km" label="Quilometragem atual">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Vehicles
