import { useEffect, useState } from 'react'
import { Button, Form, Input, Row, Col, message } from 'antd'
import PageHeader from '../components/PageHeader'
import { call } from '../utils/api'

export default function Empresa() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    call(window.api.empresa.get()).then((data) => {
      if (!active) return
      if (data) form.setFieldsValue(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [form])

  const save = async (values) => {
    setSaving(true)
    const data = await call(window.api.empresa.save(values))
    setSaving(false)
    if (data) {
      form.setFieldsValue(data)
      message.success('Dados da empresa salvos')
    }
  }

  return (
    <>
      <PageHeader title="Dados da empresa" />
      <Form
        form={form}
        layout="vertical"
        onFinish={save}
        disabled={loading || saving}
        style={{ maxWidth: 800 }}
      >
        <Row gutter={16}>
          <Col xs={24} md={14}>
            <Form.Item
              name="nome"
              label="Nome da empresa ou oficina"
              rules={[{ required: true, message: 'Informe o nome da empresa' }]}
            >
              <Input maxLength={120} />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item name="documento" label="CNPJ ou CPF">
              <Input maxLength={24} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="telefone" label="Telefone">
              <Input maxLength={30} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="E-mail"
              rules={[{ type: 'email', message: 'Informe um e-mail válido' }]}
            >
              <Input maxLength={120} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="endereco" label="Endereço">
              <Input.TextArea rows={2} maxLength={240} />
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" htmlType="submit" loading={saving} disabled={loading}>
          Salvar dados
        </Button>
      </Form>
    </>
  )
}
