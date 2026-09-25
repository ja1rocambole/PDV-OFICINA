import { useState } from 'react'
import {
  AppstoreOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons'
import { Button, Layout, Menu, Typography } from 'antd'

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
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
