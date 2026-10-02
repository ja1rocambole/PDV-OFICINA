import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Popconfirm, Space, Table, message } from 'antd'

const emptyClient = {
  name: '',
  cpf_cnpj: '',
  phone: '',
  email: '',
  address: ''
}

function Clients() {
  const [clients, setClients] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [form] = Form.useForm()

  async function loadClients() {
    setIsLoading(true)
    try {
      setClients(await window.api.clients.list())
    } catch (error) {
      message.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadClients)
  }, [])

  function openCreateModal() {
    setEditingClient(null)
    form.setFieldsValue(emptyClient)
    setIsModalOpen(true)
  }

  function openEditModal(client) {
    setEditingClient(client)
    form.setFieldsValue(client)
    setIsModalOpen(true)
  }

  async function saveClient(values) {
    try {
      if (editingClient) {
        await window.api.clients.update(editingClient.id, values)
        message.success('Cliente atualizado')
      } else {
        await window.api.clients.create(values)
        message.success('Cliente cadastrado')
      }
      setIsModalOpen(false)
      await loadClients()
    } catch (error) {
      message.error(error.message)
    }
  }

  async function deleteClient(id) {
    try {
      await window.api.clients.delete(id)
      message.success('Cliente excluído')
      await loadClients()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'CPF/CNPJ', dataIndex: 'cpf_cnpj', key: 'cpf_cnpj' },
    { title: 'Telefone', dataIndex: 'phone', key: 'phone' },
    { title: 'E-mail', dataIndex: 'email', key: 'email' },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, client) => (
        <Space>
          <Button onClick={() => openEditModal(client)}>Editar</Button>
          <Popconfirm
            title="Excluir este cliente?"
            description="Essa ação não poderá ser desfeita."
            onConfirm={() => deleteClient(client.id)}
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
          Novo cliente
        </Button>
        <Table rowKey="id" columns={columns} dataSource={clients} loading={isLoading} />
      </Space>

      <Modal
        title={editingClient ? 'Editar cliente' : 'Novo cliente'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        okText="Salvar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" onFinish={saveClient} initialValues={emptyClient}>
          <Form.Item
            name="name"
            label="Nome"
            rules={[{ required: true, message: 'Informe o nome' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="cpf_cnpj" label="CPF/CNPJ">
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Telefone"
            rules={[{ required: true, message: 'Informe o telefone' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="E-mail"
            rules={[{ type: 'email', message: 'E-mail inválido' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Endereço">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Clients
