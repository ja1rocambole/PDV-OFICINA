import { Form, Input, InputNumber, Switch, Tag } from 'antd'
import CrudPage from '../components/CrudPage'
import { formatCurrency } from '../utils/format'
import { validateCpf, validateTelefone } from '../utils/validators'

const columns = [
  { title: 'Nome', dataIndex: 'nome' },
  { title: 'CPF', dataIndex: 'cpf' },
  { title: 'Cargo', dataIndex: 'cargo' },
  { title: 'Telefone', dataIndex: 'telefone' },
  { title: 'Salário', dataIndex: 'salario', render: formatCurrency },
  {
    title: 'Status',
    dataIndex: 'ativo',
    render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Ativo' : 'Inativo'}</Tag>
  }
]

export default function Funcionarios() {
  return (
    <CrudPage
      title="Funcionários"
      singular="Funcionário"
      api={window.api.funcionarios}
      columns={columns}
      searchPlaceholder="Buscar por nome, CPF ou cargo"
      initialValues={{ ativo: true, salario: 0 }}
      toForm={(r) => ({ ...r, ativo: !!r.ativo })}
      toPayload={(v) => ({ ...v, ativo: v.ativo ? 1 : 0 })}
    >
      <Form.Item name="nome" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="cpf" label="CPF" rules={[{ validator: validateCpf }]}>
        <Input placeholder="000.000.000-00" />
      </Form.Item>
      <Form.Item name="cargo" label="Cargo">
        <Input />
      </Form.Item>
      <Form.Item name="telefone" label="Telefone" rules={[{ validator: validateTelefone }]}>
        <Input placeholder="(00) 00000-0000" />
      </Form.Item>
      <Form.Item name="salario" label="Salário">
        <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="R$" />
      </Form.Item>
      <Form.Item name="ativo" label="Ativo" valuePropName="checked">
        <Switch checkedChildren="Sim" unCheckedChildren="Não" />
      </Form.Item>
    </CrudPage>
  )
}
