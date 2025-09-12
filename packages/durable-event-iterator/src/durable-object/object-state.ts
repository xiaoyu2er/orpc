import type { DurableEventIteratorWebsocket } from './websocket'
import { toDurableEventIteratorWebsocket } from './websocket'

export interface DurableEventIteratorObjectState extends DurableObjectState {
  getWebSockets(...args: Parameters<DurableObjectState['getWebSockets']>): DurableEventIteratorWebsocket[]
}

export function createDurableEventIteratorObjectState(ctx: DurableObjectState): DurableEventIteratorObjectState {
  const proxy = new Proxy(ctx, {
    get(target, prop) {
      if (prop === 'getWebSockets') {
        const getWebSockets: DurableObjectState['getWebSockets'] = (...args) => {
          return ctx.getWebSockets(...args).map(ws => toDurableEventIteratorWebsocket(ws))
        }
        return getWebSockets
      }

      const v = Reflect.get(target, prop)

      if (typeof v === 'function') {
        return v.bind(target)
      }

      return v
    },
  })

  return proxy as any
}
