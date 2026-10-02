import { useState } from 'react'
import {
  AppstoreOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  CarOutlined,
  TeamOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons'
import { Button, Layout, Menu, Typography } from 'antd'
import Clients from './components/Clients'
import Vehicles from './components/Vehicles'
import Products from './components/Products'
import Employees from './components/Employees'
import ServiceOrders from './components/ServiceOrders'

const { Header, Sider, Content } = Layout
const { Title } = Typography

function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [currentPage, setCurrentPage] = useState('vendas')

  const menuItems = [
    {
      key: 'vendas',
      icon: <ShoppingCartOutlined />,
      label: 'Vendas'
    },
    {
      key: 'produtos',
      icon: <AppstoreOutlined />,
      label: 'Produtos'
    },
    {
      key: 'clientes',
      icon: <UserOutlined />,
      label: 'Clientes'
    },
    {
      key: 'veiculos',
      icon: <CarOutlined />,
      label: 'Veículos'
    },
    {
      key: 'funcionarios',
      icon: <TeamOutlined />,
      label: 'Funcionários'
    },
    {
      key: 'ordens',
      icon: <FileTextOutlined />,
      label: 'Ordens de serviço'
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} trigger={null}>
        <div
          style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: 'bold',
            padding: 24
          }}
        >
          {collapsed ? 'PO' : 'PDV Oficina'}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPage]}
          items={menuItems}
          onClick={({ key }) => setCurrentPage(key)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
        </Header>

        <Content style={{ margin: 24 }}>
          <Title level={2}>{currentPage}</Title>
          {currentPage === 'clientes' && <Clients />}
          {currentPage === 'veiculos' && <Vehicles />}
          {currentPage === 'produtos' && <Products />}
          {currentPage === 'funcionarios' && <Employees />}
          {currentPage === 'ordens' && <ServiceOrders />}
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
