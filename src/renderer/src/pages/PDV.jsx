import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Empty,
  InputNumber,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message
} from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import { call } from '../utils/api'
import { formatCurrency, round2 } from '../utils/format'

const pagamentos = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'cartao_credito', label: 'Cartão de crédito' }
]

export default function PDV() {
  const [produtos, setProdutos] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [carrinho, setCarrinho] = useState([])
  const [desconto, setDesconto] = useState(0)
  const [pagamento, setPagamento] = useState('dinheiro')
  const [funcionarioId, setFuncionarioId] = useState()
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [p, f] = await Promise.all([
      call(window.api.produtos.list('')),
      call(window.api.funcionarios.list(''))
    ])
    if (p) setProdutos(p)
    if (f) {
      const ativos = f.filter((x) => x.ativo)
      setFuncionarios(ativos)
      setFuncionarioId((cur) => cur ?? ativos[0]?.id)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const filtrados = produtos.filter(
    (p) =>
      (tipo === 'todos' || p.tipo === tipo) &&
      p.descricao.toLowerCase().includes(search.trim().toLowerCase())
  )

  const subtotal = useMemo(
    () => carrinho.reduce((s, i) => s + round2(i.quantidade * i.valor_unitario), 0),
    [carrinho]
  )
  const total = Math.max(0, round2(subtotal - (desconto || 0)))

  const adicionar = (p) => {
    const noCarrinho = carrinho.find((i) => i.produto_id === p.id)
    const qtd = (noCarrinho?.quantidade || 0) + 1
    if (p.tipo === 'peca' && qtd > p.estoque) {
      message.error(`Estoque insuficiente para ${p.descricao}`)
      return
    }
    if (noCarrinho) {
      setCarrinho((c) => c.map((i) => (i.produto_id === p.id ? { ...i, quantidade: qtd } : i)))
    } else {
      setCarrinho((c) => [
        ...c,
        {
          produto_id: p.id,
          descricao: p.descricao,
          tipo: p.tipo,
          estoque: p.estoque,
          quantidade: 1,
          valor_unitario: p.preco_venda
        }
      ])
    }
  }

  const alterarQtd = (id, v) => {
    const item = carrinho.find((i) => i.produto_id === id)
    const qtd = v || 1
    if (item.tipo === 'peca' && qtd > item.estoque) {
      message.error(`Estoque insuficiente para ${item.descricao}`)
      return
    }
    setCarrinho((c) => c.map((i) => (i.produto_id === id ? { ...i, quantidade: qtd } : i)))
  }

  const finalizar = async () => {
    if (!carrinho.length) {
      message.error('O carrinho está vazio')
      return
    }
    setSaving(true)
    const res = await call(
      window.api.pdv.finalizarVenda({
        itens: carrinho.map((i) => ({
          produto_id: i.produto_id,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario
        })),
        desconto: desconto || 0,
        forma_pagamento: pagamento,
        funcionario_id: funcionarioId
      })
    )
    setSaving(false)
    if (res) {
      message.success(`Venda finalizada! Total: ${formatCurrency(res.total)}`)
      setCarrinho([])
      setDesconto(0)
      load()
    }
  }

  const colunas = [
    { title: 'Item', dataIndex: 'descricao' },
    {
      title: 'Qtd.',
      width: 90,
      render: (_, i) => (
        <InputNumber
          min={1}
          size="small"
          value={i.quantidade}
          onChange={(v) => alterarQtd(i.produto_id, v)}
        />
      )
    },
    {
      title: 'Subtotal',
      width: 110,
      render: (_, i) => formatCurrency(round2(i.quantidade * i.valor_unitario))
    },
    {
      title: '',
      width: 40,
      render: (_, i) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => setCarrinho((c) => c.filter((x) => x.produto_id !== i.produto_id))}
        />
      )
    }
  ]

  return (
    <>
      <PageHeader title="PDV" />
      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Input.Search
            allowClear
            placeholder="Buscar produto ou serviço"
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <Tabs
            activeKey={tipo}
            onChange={setTipo}
            items={[
              { key: 'todos', label: 'Todos' },
              { key: 'peca', label: 'Peças' },
              { key: 'servico', label: 'Serviços' }
            ]}
          />
          {filtrados.length === 0 ? (
            <Empty description="Nenhum item encontrado" />
          ) : (
            <Row gutter={[12, 12]}>
              {filtrados.map((p) => {
                const semEstoque = p.tipo === 'peca' && p.estoque <= 0
                return (
                  <Col key={p.id} xs={12} md={8}>
                    <Card
                      hoverable={!semEstoque}
                      size="small"
                      onClick={() => !semEstoque && adicionar(p)}
                      style={{ opacity: semEstoque ? 0.5 : 1 }}
                    >
                      <Typography.Text strong>{p.descricao}</Typography.Text>
                      <div>{formatCurrency(p.preco_venda)}</div>
                      <Tag color={p.tipo === 'peca' ? 'blue' : 'purple'}>
                        {p.tipo === 'peca' ? `Peça · estoque ${p.estoque}` : 'Serviço'}
                      </Tag>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          )}
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Carrinho">
            <Table
              rowKey="produto_id"
              size="small"
              pagination={false}
              columns={colunas}
              dataSource={carrinho}
              locale={{ emptyText: 'Carrinho vazio' }}
            />
            <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
              <Select
                style={{ width: '100%' }}
                placeholder="Funcionário"
                value={funcionarioId}
                onChange={setFuncionarioId}
                options={funcionarios.map((f) => ({ value: f.id, label: f.nome }))}
              />
              <Select
                style={{ width: '100%' }}
                value={pagamento}
                onChange={setPagamento}
                options={pagamentos}
              />
              <Space>
                Desconto (R$):
                <InputNumber
                  min={0}
                  precision={2}
                  value={desconto}
                  onChange={(v) => setDesconto(v || 0)}
                />
              </Space>
              <Typography.Text>Subtotal: {formatCurrency(subtotal)}</Typography.Text>
              <Typography.Title level={3} style={{ margin: 0 }}>
                Total: {formatCurrency(total)}
              </Typography.Title>
              <Button type="primary" size="large" block loading={saving} onClick={finalizar}>
                Finalizar Venda
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </>
  )
}
