import { useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  CarOutlined,
  DashboardOutlined,
  HomeOutlined,
  AppstoreOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined
} from '@ant-design/icons'
import { ConfigProvider, Layout, Menu, Typography } from 'antd'
import ptBR from 'antd/locale/pt_BR'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Veiculos from './pages/Veiculos'
import Funcionarios from './pages/Funcionarios'
import Produtos from './pages/Produtos'
import OrdensServico from './pages/OrdensServico'
import PDV from './pages/PDV'

dayjs.locale('pt-br')

const { Header, Sider, Content } = Layout

const routes = [
  { path: '/dashboard', title: 'Dashboard', element: <Dashboard /> },
  { path: '/cadastros/clientes', title: 'Clientes', element: <Clientes /> },
  { path: '/cadastros/veiculos', title: 'Veículos', element: <Veiculos /> },
  { path: '/cadastros/funcionarios', title: 'Funcionários', element: <Funcionarios /> },
  { path: '/cadastros/produtos', title: 'Produtos e Serviços', element: <Produtos /> },
  { path: '/funcionamento/ordens-servico', title: 'Ordem de Serviços', element: <OrdensServico /> },
  { path: '/funcionamento/pdv', title: 'PDV', element: <PDV /> }
]

const menuItems = [
  {
    key: 'home',
    label: 'Home',
    icon: <HomeOutlined />,
    children: [{ key: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> }]
  },
  {
    key: 'cadastros',
    label: 'Cadastros',
    icon: <UserOutlined />,
    children: [
      { key: '/cadastros/clientes', label: 'Clientes', icon: <UserOutlined /> },
      { key: '/cadastros/veiculos', label: 'Veículos', icon: <CarOutlined /> },
      { key: '/cadastros/funcionarios', label: 'Funcionários', icon: <TeamOutlined /> },
      { key: '/cadastros/produtos', label: 'Produtos e Serviços', icon: <AppstoreOutlined /> }
    ]
  },
  {
    key: 'funcionamento',
    label: 'Funcionamento',
    icon: <ToolOutlined />,
    children: [
      { key: '/funcionamento/ordens-servico', label: 'Ordem de Serviços', icon: <ToolOutlined /> },
      { key: '/funcionamento/pdv', label: 'PDV', icon: <ShoppingCartOutlined /> }
    ]
  }
]

function Shell() {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const current = routes.find((r) => r.path === pathname)
  const group = pathname.split('/')[1]
  const openKeys = group === 'dashboard' ? ['home'] : [group]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={240}>
        <div style={{ color: '#fff', padding: 16, fontWeight: 600, textAlign: 'center' }}>
          {collapsed ? 'OS' : 'Oficina Mecânica'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px' }}>
          <Typography.Title level={4} style={{ margin: 0, lineHeight: '64px' }}>
            {current?.title}
          </Typography.Title>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 8 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {routes.map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

function App() {
  return (
    <ConfigProvider locale={ptBR}>
      <HashRouter>
        <Shell />
      </HashRouter>
    </ConfigProvider>
  )
}

export default App
