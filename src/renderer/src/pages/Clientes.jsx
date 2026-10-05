import { Form, Input } from 'antd'
import CrudPage from '../components/CrudPage'
import { validateCpf, validateTelefone } from '../utils/validators'

const columns = [
  { title: 'Nome', dataIndex: 'nome' },
  { title: 'CPF', dataIndex: 'cpf' },
  { title: 'Telefone', dataIndex: 'telefone' },
  { title: 'E-mail', dataIndex: 'email' }
]

export default function Clientes() {
  return (
    <CrudPage
      title="Clientes"
      singular="Cliente"
      api={window.api.clientes}
      columns={columns}
      searchPlaceholder="Buscar por nome ou CPF"
    >
      <Form.Item name="nome" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="cpf" label="CPF" rules={[{ validator: validateCpf }]}>
        <Input placeholder="000.000.000-00" />
      </Form.Item>
      <Form.Item name="telefone" label="Telefone" rules={[{ validator: validateTelefone }]}>
        <Input placeholder="(00) 00000-0000" />
      </Form.Item>
      <Form.Item
        name="email"
        label="E-mail"
        rules={[{ type: 'email', message: 'E-mail inválido' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item name="endereco" label="Endereço">
        <Input />
      </Form.Item>
    </CrudPage>
  )
}
