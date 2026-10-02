import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  clients: {
    list: () => electronAPI.ipcRenderer.invoke('clients:list'),
    create: (client) => electronAPI.ipcRenderer.invoke('clients:create', client),
    update: (id, client) => electronAPI.ipcRenderer.invoke('clients:update', id, client),
    delete: (id) => electronAPI.ipcRenderer.invoke('clients:delete', id)
  },
  vehicles: {
    list: () => electronAPI.ipcRenderer.invoke('vehicles:list'),
    create: (vehicle) => electronAPI.ipcRenderer.invoke('vehicles:create', vehicle),
    update: (id, vehicle) => electronAPI.ipcRenderer.invoke('vehicles:update', id, vehicle),
    delete: (id) => electronAPI.ipcRenderer.invoke('vehicles:delete', id)
  },
  products: {
    list: () => electronAPI.ipcRenderer.invoke('products:list'),
    create: (product) => electronAPI.ipcRenderer.invoke('products:create', product),
    update: (id, product) => electronAPI.ipcRenderer.invoke('products:update', id, product),
    delete: (id) => electronAPI.ipcRenderer.invoke('products:delete', id)
  },
  employees: {
    list: (filters) => electronAPI.ipcRenderer.invoke('employees:list', filters),
    get: (id) => electronAPI.ipcRenderer.invoke('employees:get', id),
    create: (employee) => electronAPI.ipcRenderer.invoke('employees:create', employee),
    update: (id, employee) => electronAPI.ipcRenderer.invoke('employees:update', id, employee),
    delete: (id) => electronAPI.ipcRenderer.invoke('employees:delete', id),
    toggleActive: (id, active) =>
      electronAPI.ipcRenderer.invoke('employees:toggle-active', id, active)
  },
  serviceOrders: {
    list: (filters) => electronAPI.ipcRenderer.invoke('service-orders:list', filters),
    get: (id) => electronAPI.ipcRenderer.invoke('service-orders:get', id),
    create: (order) => electronAPI.ipcRenderer.invoke('service-orders:create', order),
    update: (id, order) => electronAPI.ipcRenderer.invoke('service-orders:update', id, order),
    delete: (id) => electronAPI.ipcRenderer.invoke('service-orders:delete', id),
    updateStatus: (id, status) =>
      electronAPI.ipcRenderer.invoke('service-orders:update-status', id, status)
  },
  osItems: {
    list: (serviceOrderId) => electronAPI.ipcRenderer.invoke('os-items:list', serviceOrderId),
    create: (item) => electronAPI.ipcRenderer.invoke('os-items:create', item),
    update: (id, item) => electronAPI.ipcRenderer.invoke('os-items:update', id, item),
    delete: (id) => electronAPI.ipcRenderer.invoke('os-items:delete', id)
  },
  osServices: {
    list: (serviceOrderId) => electronAPI.ipcRenderer.invoke('os-services:list', serviceOrderId),
    create: (service) => electronAPI.ipcRenderer.invoke('os-services:create', service),
    update: (id, service) => electronAPI.ipcRenderer.invoke('os-services:update', id, service),
    delete: (id) => electronAPI.ipcRenderer.invoke('os-services:delete', id)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
