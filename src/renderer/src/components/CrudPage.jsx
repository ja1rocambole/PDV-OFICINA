import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Popconfirm, Space, Table, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'
import PageHeader from './PageHeader'
import { call } from '../utils/api'

export default function CrudPage({
  title,
  singular,
  api,
  columns,
  children,
  searchPlaceholder,
  initialValues,
  toForm = (r) => r,
  toPayload = (v) => v,
  loadExtra
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const load = useCallback(
    async (term) => {
      setLoading(true)
      const data = await call(api.list(term))
      if (data) setRows(data)
      setLoading(false)
    },
    [api]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load('')
    if (loadExtra) loadExtra()
  }, [load, loadExtra])

  const openModal = (record) => {
    setEditing(record)
    form.resetFields()
    form.setFieldsValue(record ? toForm(record) : (initialValues ?? {}))
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    setSaving(true)
    const payload = toPayload(values)
    const res = editing
      ? await call(api.update(editing.id, payload))
      : await call(api.create(payload))
    setSaving(false)
    if (res) {
      message.success(`${singular} salvo com sucesso`)
      setOpen(false)
      load(search)
      if (loadExtra) loadExtra()
    }
  }

  const remove = async (record) => {
    const res = await call(api.remove(record.id))
    if (res) {
      message.success(`${singular} excluído com sucesso`)
      load(search)
    }
  }

  const actionColumn = {
    title: 'Ações',
    key: 'acoes',
    width: 120,
    render: (_, record) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)} />
        <Popconfirm
          title="Excluir registro?"
          okText="Sim"
          cancelText="Não"
          onConfirm={() => remove(record)}
        >
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )
  }

  return (
    <>
      <PageHeader
        title={title}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>
            Novo
          </Button>
        }
      />
      <Input.Search
        allowClear
        placeholder={searchPlaceholder}
        style={{ maxWidth: 400, marginBottom: 16 }}
        onSearch={(v) => {
          setSearch(v)
          load(v)
        }}
      />
      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={rows}
        columns={[...columns, actionColumn]}
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />
      <Modal
        title={editing ? `Editar ${singular}` : `Novo ${singular}`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={save}
        confirmLoading={saving}
        okText="Salvar"
        cancelText="Cancelar"
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical">
          {children}
        </Form>
      </Modal>
    </>
  )
}

CrudPage.propTypes = {
  title: PropTypes.string.isRequired,
  singular: PropTypes.string.isRequired,
  api: PropTypes.object.isRequired,
  columns: PropTypes.array.isRequired,
  children: PropTypes.node,
  searchPlaceholder: PropTypes.string,
  initialValues: PropTypes.object,
  toForm: PropTypes.func,
  toPayload: PropTypes.func,
  loadExtra: PropTypes.func
}
