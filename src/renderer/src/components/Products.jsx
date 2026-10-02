import { useEffect, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, message } from 'antd'

const emptyProduct = {
  sku: '',
  name: '',
  cost_price: 0,
  selling_price: null,
  stock_quantity: 0,
  min_stock: 1
}

function Products() {
  const [products, setProducts] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [form] = Form.useForm()

  async function loadProducts() {
    setIsLoading(true)
    try {
      setProducts(await window.api.products.list())
    } catch (error) {
      message.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadProducts)
  }, [])

  function openCreateModal() {
    setEditingProduct(null)
    form.setFieldsValue(emptyProduct)
    setIsModalOpen(true)
  }

  function openEditModal(product) {
    setEditingProduct(product)
    form.setFieldsValue(product)
    setIsModalOpen(true)
  }

  async function saveProduct(values) {
    try {
      if (editingProduct) {
        await window.api.products.update(editingProduct.id, values)
        message.success('Produto atualizado')
      } else {
        await window.api.products.create(values)
        message.success('Produto cadastrado')
      }
      setIsModalOpen(false)
      await loadProducts()
    } catch (error) {
      message.error(error.message)
    }
  }

  async function deleteProduct(id) {
    try {
      await window.api.products.delete(id)
      message.success('Produto excluído')
      await loadProducts()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    {
      title: 'Preço de custo',
      dataIndex: 'cost_price',
      key: 'cost_price',
      render: (value) => `R$ ${Number(value).toFixed(2)}`
    },
    {
      title: 'Preço de venda',
      dataIndex: 'selling_price',
      key: 'selling_price',
      render: (value) => `R$ ${Number(value).toFixed(2)}`
    },
    { title: 'Estoque', dataIndex: 'stock_quantity', key: 'stock_quantity' },
    { title: 'Estoque mínimo', dataIndex: 'min_stock', key: 'min_stock' },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, product) => (
        <Space>
          <Button onClick={() => openEditModal(product)}>Editar</Button>
          <Popconfirm
            title="Excluir este produto?"
            description="Essa ação não poderá ser desfeita."
            onConfirm={() => deleteProduct(product.id)}
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
          Novo produto
        </Button>
        <Table rowKey="id" columns={columns} dataSource={products} loading={isLoading} />
      </Space>

      <Modal
        title={editingProduct ? 'Editar produto' : 'Novo produto'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        okText="Salvar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" onFinish={saveProduct} initialValues={emptyProduct}>
          <Form.Item name="sku" label="SKU">
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="Nome"
            rules={[{ required: true, message: 'Informe o nome do produto' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="cost_price"
            label="Preço de custo"
            rules={[{ required: true, message: 'Informe o preço de custo' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="selling_price"
            label="Preço de venda"
            rules={[{ required: true, message: 'Informe o preço de venda' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="stock_quantity"
            label="Estoque atual"
            rules={[{ required: true, message: 'Informe o estoque atual' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="min_stock"
            label="Estoque mínimo"
            rules={[{ required: true, message: 'Informe o estoque mínimo' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Products
