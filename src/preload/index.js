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
