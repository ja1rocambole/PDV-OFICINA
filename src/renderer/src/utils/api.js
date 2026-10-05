import { message } from 'antd'

// Executa uma chamada IPC; exibe message.error e retorna null em caso de falha.
export async function call(promise) {
  try {
    const res = await promise
    if (!res?.success) {
      message.error(res?.error || 'Erro ao executar a operação')
      return null
    }
    return res.data
  } catch (error) {
    message.error(error?.message || 'Erro ao executar a operação')
    return null
  }
}
