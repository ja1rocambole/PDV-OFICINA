import { useCallback, useState } from 'react'
import { Form, Input, InputNumber, Select } from 'antd'
import CrudPage from '../components/CrudPage'
import { call } from '../utils/api'
import { validatePlaca } from '../utils/validators'

const columns = [
  { title: 'Placa', dataIndex: 'placa' },
  { title: 'Cliente', dataIndex: 'cliente_nome' },
  { title: 'Marca', dataIndex: 'marca' },
  { title: 'Modelo', dataIndex: 'modelo' },
  { title: 'Ano', dataIndex: 'ano' },
  { title: 'Cor', dataIndex: 'cor' }
]

export default function Veiculos() {
  const [clientes, setClientes] = useState([])
  const loadExtra = useCallback(async () => {
    const data = await call(window.api.clientes.list(''))
    if (data) setClientes(data)
  }, [])

  return (
    <CrudPage
      title="Veículos"
      singular="Veículo"
      api={window.api.veiculos}
      columns={columns}
      loadExtra={loadExtra}
      searchPlaceholder="Buscar por placa, modelo ou cliente"
      toPayload={(v) => ({ ...v, placa: String(v.placa).toUpperCase() })}
    >
      <Form.Item
        name="cliente_id"
        label="Cliente"
        rules={[{ required: true, message: 'Selecione o cliente' }]}
      >
        <Select
          showSearch={{ optionFilterProp: 'label' }}
          placeholder="Selecione"
          options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
        />
      </Form.Item>
      <Form.Item
        name="placa"
        label="Placa"
        rules={[{ required: true, message: 'Informe a placa' }, { validator: validatePlaca }]}
      >
        <Input maxLength={8} placeholder="ABC1D23" />
      </Form.Item>
      <Form.Item name="marca" label="Marca">
        <Input />
      </Form.Item>
      <Form.Item name="modelo" label="Modelo">
        <Input />
      </Form.Item>
      <Form.Item name="ano" label="Ano">
        <InputNumber min={1900} max={2100} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="cor" label="Cor">
        <Input />
      </Form.Item>
      <Form.Item name="km" label="Km">
        <InputNumber min={0} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="observacoes" label="Observações">
        <Input.TextArea rows={2} />
      </Form.Item>
    </CrudPage>
  )
}
