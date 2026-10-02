import { useCallback, useEffect, useState } from 'react'
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
  Tag,
  message
} from 'antd'

const emptyEmployee = {
  name: '',
  cpf_cnpj: '',
  phone: '',
  email: '',
  role: 'FUNCIONARIO',
  commission_percentage: 0,
  is_active: 1
}

function Employees() {
  const [employees, setEmployees] = useState([])
  const [filters, setFilters] = useState({ search: '', active: 'all' })
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const loadEmployees = useCallback(async () => {
    setLoading(true)
    try {
      setEmployees(await window.api.employees.list(filters))
    } catch (error) {
      message.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void Promise.resolve().then(loadEmployees)
  }, [loadEmployees])

  function openModal(employee = null) {
    setEditing(employee)
    form.setFieldsValue(employee || emptyEmployee)
    setModalOpen(true)
  }

  async function save(values) {
    try {
      if (editing) {
        await window.api.employees.update(editing.id, values)
        message.success('Funcionário atualizado')
      } else {
        await window.api.employees.create(values)
        message.success('Funcionário cadastrado')
      }
      setModalOpen(false)
      await loadEmployees()
    } catch (error) {
      message.error(error.message)
    }
  }

  async function toggle(employee) {
    try {
      await window.api.employees.toggleActive(employee.id, !employee.is_active)
      message.success(employee.is_active ? 'Funcionário desativado' : 'Funcionário ativado')
      await loadEmployees()
    } catch (error) {
      message.error(error.message)
    }
  }

  async function remove(employee) {
    try {
      const result = await window.api.employees.delete(employee.id)
      message.success(
        result.deactivated ? 'Funcionário desativado por possuir histórico' : 'Funcionário excluído'
      )
      await loadEmployees()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'CPF', dataIndex: 'cpf_cnpj', key: 'cpf_cnpj' },
    { title: 'Telefone', dataIndex: 'phone', key: 'phone' },
    { title: 'E-mail', dataIndex: 'email', key: 'email' },
    { title: 'Cargo', dataIndex: 'role', key: 'role' },
    { title: 'Comissão', dataIndex: 'commission_percentage', render: (value) => `${value}%` },
    {
      title: 'Situação',
      dataIndex: 'is_active',
      render: (active) => (
        <Tag color={active ? 'green' : 'default'}>{active ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ações',
      render: (_, employee) => (
        <Space>
          <Button onClick={() => openModal(employee)}>Editar</Button>
          <Popconfirm
            title={employee.is_active ? 'Desativar funcionário?' : 'Ativar funcionário?'}
            onConfirm={() => toggle(employee)}
            okText="Confirmar"
            cancelText="Cancelar"
          >
            <Button>{employee.is_active ? 'Desativar' : 'Ativar'}</Button>
          </Popconfirm>
          {!employee.is_active && (
            <Popconfirm
              title="Excluir este funcionário?"
              description="A exclusão só será possível sem histórico de ordens."
              onConfirm={() => remove(employee)}
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

  return (
    <>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space wrap>
          <Input.Search
            placeholder="Buscar por nome, CPF, telefone ou e-mail"
            allowClear
            onSearch={(search) => setFilters((current) => ({ ...current, search }))}
            style={{ width: 320 }}
          />
          <Select
            value={filters.active}
            onChange={(active) => setFilters((current) => ({ ...current, active }))}
            options={[
              { value: 'all', label: 'Todos' },
              { value: '1', label: 'Ativos' },
              { value: '0', label: 'Inativos' }
            ]}
          />
          <Button type="primary" onClick={() => openModal()}>
            Novo funcionário
          </Button>
        </Space>
        <Table rowKey="id" columns={columns} dataSource={employees} loading={loading} />
      </Space>
      <Modal
        title={editing ? 'Editar funcionário' : 'Novo funcionário'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Salvar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" initialValues={emptyEmployee} onFinish={save}>
          <Form.Item
            name="name"
            label="Nome"
            rules={[{ required: true, message: 'Informe o nome' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="cpf_cnpj" label="CPF">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Telefone">
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="E-mail"
            rules={[{ type: 'email', message: 'E-mail inválido' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Cargo">
            <Input />
          </Form.Item>
          <Form.Item name="commission_percentage" label="Comissão (%)">
            <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_active" label="Situação">
            <Select
              options={[
                { value: 1, label: 'Ativo' },
                { value: 0, label: 'Inativo' }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Employees
