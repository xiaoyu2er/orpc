import type { DurableIteratorTokenPayload } from '../schemas'
import { DurableIteratorError } from '../error'

export interface DurableIteratorWebsocketInternal {
  /**
   * Access the original websocket instance
   *
   * @warning Be careful when using original because you can accidentally modifying internal state.
   */
  original: WebSocket

  /**
   * Serialize the hibernation id used for publishing events to the client
   */
  serializeHibernationId(id: string): void

  /**
   * Deserialize the hibernation id used for publishing events to the client
   */
  deserializeHibernationId(): string | undefined

  /**
   * Serialize the token payload usually when client connected
   *
   * @warning this method should be called when client established connection
   */
  serializeTokenPayload(payload: DurableIteratorTokenPayload): void

  /**
   * Deserialize the payload attached when client connected
   *
   * @warning this method assumes that the token payload is already set when client established connection
   */
  deserializeTokenPayload(): DurableIteratorTokenPayload

  /**
   * Close the websocket connection if expired
   *
   * @warning this method assumes that the token payload is already set when client established connection
   */
  closeIfExpired(): void
}

export interface DurableIteratorWebsocket extends WebSocket {
  /**
   * Durable Event Iterator internal apis
   */
  ['~orpc']: DurableIteratorWebsocketInternal
}

const websocketReferencesCache = new WeakMap<WebSocket, DurableIteratorWebsocket>()

/**
 * Create a Durable Event Iterator WebSocket from a regular WebSocket
 *
 * @info The websocket automatically closes if expired before sending data
 */
export function toDurableIteratorWebsocket(original: WebSocket): DurableIteratorWebsocket {
  if ('~orpc' in original) {
    return original as DurableIteratorWebsocket
  }

  /**
   * The WebSocket adapter relies on reference equality, so we must ensure that
   * the same WebSocket always maps to the same DurableIteratorWebSocket.
   */
  const cached = websocketReferencesCache.get(original)
  if (cached) {
    return cached
  }

  const internal: DurableIteratorWebsocketInternal = {
    original,
    serializeHibernationId(id) {
      original.serializeAttachment({
        ...original.deserializeAttachment(),
        hi: id,
      })
    },
    deserializeHibernationId() {
      return original.deserializeAttachment()?.hi
    },
    serializeTokenPayload(payload) {
      original.serializeAttachment({
        ...original.deserializeAttachment(),
        tp: payload,
      })
    },
    deserializeTokenPayload() {
      const payload = original.deserializeAttachment()?.tp

      if (!payload) {
        throw new DurableIteratorError('Token payload not found, please call serializeTokenPayload first')
      }

      return payload
    },
    closeIfExpired() {
      const payload = internal.deserializeTokenPayload()

      if (payload.exp < Date.now() / 1000) {
        original.close(1008, 'Token expired')
      }
    },
  }

  const serializeAttachment: WebSocket['serializeAttachment'] = (wa) => {
    original.serializeAttachment({
      ...original.deserializeAttachment(),
      wa,
    })
  }

  const deserializeAttachment: WebSocket['deserializeAttachment'] = () => {
    return original.deserializeAttachment()?.wa
  }

  const send: WebSocket['send'] = (data) => {
    internal.closeIfExpired() // should check before to ensure nothing send after expired
    return original.send(data)
  }

  const proxy = new Proxy(original, {
    get(_, prop) {
      if (prop === '~orpc') {
        return internal
      }

      if (prop === 'serializeAttachment') {
        return serializeAttachment
      }

      if (prop === 'deserializeAttachment') {
        return deserializeAttachment
      }

      if (prop === 'send') {
        return send
      }

      const v = Reflect.get(original, prop)
      return typeof v === 'function'
        ? v.bind(original) // Require .bind itself for calling
        : v
    },
    has(_, p) {
      return p === '~orpc' || Reflect.has(original, p)
    },
  })

  websocketReferencesCache.set(original, proxy as DurableIteratorWebsocket)
  return proxy as DurableIteratorWebsocket
}
