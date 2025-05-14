import type { ExposedORPCHandlerChannel } from '@orpc/client/electron-ipc'
import { ORPC_HANDLER_CHANNEL } from '@orpc/client/electron-ipc'
import { contextBridge, ipcRenderer } from 'electron'

export function experimental_exposeORPCHandlerChannel(): void {
  contextBridge.exposeInMainWorld(ORPC_HANDLER_CHANNEL, {
    send: message => ipcRenderer.send(ORPC_HANDLER_CHANNEL, message),
    receive: callback => ipcRenderer.on(ORPC_HANDLER_CHANNEL, (_, message) => callback(message)),
  } satisfies ExposedORPCHandlerChannel)
}
