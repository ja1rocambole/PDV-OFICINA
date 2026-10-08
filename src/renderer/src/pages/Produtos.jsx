import { Form, Input, InputNumber, Select, Tag } from 'antd'
import CrudPage from '../components/CrudPage'
import { formatCurrency } from '../utils/format'

const columns = [
  { title: 'Descrição', dataIndex: 'descricao' },
  {
    title: 'Tipo',
    dataIndex: 'tipo',
    render: (tipo) => (
      <Tag color={tipo === 'peca' ? 'blue' : 'purple'}>{tipo === 'peca' ? 'Peça' : 'Serviço'}</Tag>
    )
  },
  { title: 'Preço de custo', dataIndex: 'preco_custo', render: formatCurrency },
  { title: 'Preço de venda', dataIndex: 'preco_venda', render: formatCurrency },
  { title: 'Estoque', dataIndex: 'estoque' }
]

export default function Produtos() {
  return (
    <CrudPage
      title="Produtos e Serviços"
      singular="Produto/serviço"
      api={window.api.produtos}
      columns={columns}
      searchPlaceholder="Buscar por descrição"
      initialValues={{ tipo: 'peca', preco_custo: 0, preco_venda: 0, estoque: 0 }}
      toPayload={(values) => ({
        ...values,
        estoque: values.tipo === 'servico' ? 0 : values.estoque
      })}
    >
      <Form.Item
        name="descricao"
        label="Descrição"
        rules={[{ required: true, message: 'Informe a descrição' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item name="tipo" label="Tipo" rules={[{ required: true, message: 'Selecione o tipo' }]}>
        <Select
          options={[
            { value: 'peca', label: 'Peça' },
            { value: 'servico', label: 'Serviço' }
          ]}
        />
      </Form.Item>
      <Form.Item name="preco_custo" label="Preço de custo">
        <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="R$" />
      </Form.Item>
      <Form.Item
        name="preco_venda"
        label="Preço de venda"
        rules={[{ required: true, message: 'Informe o preço de venda' }]}
      >
        <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="R$" />
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(previous, current) => previous.tipo !== current.tipo}>
        {({ getFieldValue }) =>
          getFieldValue('tipo') === 'peca' ? (
            <Form.Item name="estoque" label="Estoque" rules={[{ required: true }]}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          ) : null
        }
      </Form.Item>
    </CrudPage>
  )
}
