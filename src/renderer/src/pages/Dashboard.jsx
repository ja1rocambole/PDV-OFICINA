import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Table } from 'antd'
import { CarOutlined, DollarOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import StatusTag from '../components/StatusTag'
import { call } from '../utils/api'
import { formatCurrency, formatDate } from '../utils/format'

const columns = [
  { title: 'Nº', dataIndex: 'numero', width: 80 },
  { title: 'Cliente', dataIndex: 'cliente_nome' },
  { title: 'Veículo', dataIndex: 'veiculo_placa' },
  { title: 'Abertura', dataIndex: 'data_abertura', render: formatDate },
  { title: 'Status', dataIndex: 'status', render: (s) => <StatusTag status={s} /> },
  { title: 'Total', dataIndex: 'total', render: formatCurrency }
]

export default function Dashboard() {
  const [resumo, setResumo] = useState(null)

  useEffect(() => {
    call(window.api.dashboard.resumo()).then((d) => d && setResumo(d))
  }, [])

  return (
    <>
      <PageHeader title="Dashboard" />
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Total de clientes"
              value={resumo?.totalClientes ?? 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Veículos cadastrados"
              value={resumo?.totalVeiculos ?? 0}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="OS abertas / em andamento"
              value={resumo?.osAbertas ?? 0}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Faturamento do mês"
              value={formatCurrency(resumo?.faturamentoMes)}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>
      <Card title="Últimas ordens de serviço" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={resumo?.ultimasOS ?? []}
          pagination={false}
        />
      </Card>
    </>
  )
}
