import type { DurableIteratorWebsocket } from './websocket'
import { toDurableIteratorWebsocket } from './websocket'

export interface DurableIteratorObjectState extends DurableObjectState {
  getWebSockets(...args: Parameters<DurableObjectState['getWebSockets']>): DurableIteratorWebsocket[]
}

export function createDurableIteratorObjectState(ctx: DurableObjectState): DurableIteratorObjectState {
  const proxy = new Proxy(ctx, {
    get(target, prop) {
      if (prop === 'getWebSockets') {
        const getWebSockets: DurableObjectState['getWebSockets'] = (...args) => {
          return ctx.getWebSockets(...args).map(ws => toDurableIteratorWebsocket(ws))
        }
        return getWebSockets
      }

      const v = Reflect.get(target, prop)
      return typeof v === 'function'
        ? v.bind(target) // Require .bind itself for calling
        : v
    },
  })

  return proxy as any
}
