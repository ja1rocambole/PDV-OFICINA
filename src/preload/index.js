import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  clients: {
    list: () => electronAPI.ipcRenderer.invoke('clients:list'),
    create: (client) => electronAPI.ipcRenderer.invoke('clients:create', client),
    update: (id, client) => electronAPI.ipcRenderer.invoke('clients:update', id, client),
    delete: (id) => electronAPI.ipcRenderer.invoke('clients:delete', id)
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
