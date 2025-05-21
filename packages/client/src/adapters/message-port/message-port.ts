export type SupportedMessagePort = Pick<MessagePort, 'addEventListener' | 'postMessage'>

export type SupportedMessagePortData = string | ArrayBufferLike

export function onMessagePortMessage(port: SupportedMessagePort, callback: (data: SupportedMessagePortData) => void): void {
  port.addEventListener('message', async (event) => {
    callback(event.data)
  })
}

export function postMessagePortMessage(port: SupportedMessagePort, data: SupportedMessagePortData): void {
  port.postMessage(data)
}

export function onMessagePortClose(port: SupportedMessagePort, callback: () => void): void {
  port.addEventListener('close', callback)
}
