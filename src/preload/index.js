import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const invoke =
  (channel) =>
  (...args) =>
    ipcRenderer.invoke(channel, ...args)

const crud = (prefix) => ({
  list: invoke(`${prefix}:list`),
  get: invoke(`${prefix}:get`),
  create: invoke(`${prefix}:create`),
  update: invoke(`${prefix}:update`),
  remove: invoke(`${prefix}:remove`)
})

const api = {
  clientes: crud('clientes'),
  veiculos: crud('veiculos'),
  funcionarios: crud('funcionarios'),
  produtos: crud('produtos'),
  ordensServico: { ...crud('os'), updateStatus: invoke('os:updateStatus') },
  pdv: {
    finalizarVenda: invoke('pdv:finalizarVenda'),
    listVendas: invoke('pdv:listVendas')
  },
  empresa: {
    get: invoke('empresa:get'),
    save: invoke('empresa:save')
  },
  dashboard: { resumo: invoke('dashboard:resumo') }
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
