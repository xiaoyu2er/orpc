import type { TokenPayload } from '../schemas'
import { DurableEventIteratorError } from '../error'

export interface DurableEventIteratorWebsocketInternal {
  /**
   * Access the original websocket instance
   *
   * @warning Be careful when using original because it can break the Durable Event Iterator functionality
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
  serializeTokenPayload(payload: TokenPayload): void

  /**
   * Deserialize the payload attached when client connected
   *
   * @warning this method assumes that the token payload is already set when client established connection
   */
  deserializeTokenPayload(): TokenPayload

  /**
   * Close the websocket connection if expired
   *
   * @warning this method assumes that the token payload is already set when client established connection
   */
  closeIfExpired(): void
}

export interface DurableEventIteratorWebsocket extends WebSocket {
  /**
   * Durable Event Iterator internal apis
   */
  ['~orpc']: DurableEventIteratorWebsocketInternal
}

/**
 * Create a Durable Event Iterator WebSocket from a regular WebSocket
 *
 * @info The websocket automatically closes if expired before sending data
 */
export function toDurableEventIteratorWebsocket(original: WebSocket): DurableEventIteratorWebsocket {
  if ('~orpc' in original) {
    return original as DurableEventIteratorWebsocket
  }

  const internal: DurableEventIteratorWebsocketInternal = {
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
        throw new DurableEventIteratorError('Token payload not found, please call serializeTokenPayload first')
      }

      return payload
    },
    closeIfExpired() {
      const payload = internal.deserializeTokenPayload()

      if (payload.exp < Date.now() / 1000) {
        original.close()
      }
    },
  }

  const proxy = new Proxy(original, {
    get(_, prop) {
      if (prop === '~orpc') {
        return internal
      }

      if (prop === 'serializeAttachment') {
        const serializeAttachment: WebSocket['serializeAttachment'] = (wa) => {
          original.serializeAttachment({
            ...original.deserializeAttachment(),
            wa,
          })
        }

        return serializeAttachment
      }

      if (prop === 'deserializeAttachment') {
        const deserializeAttachment: WebSocket['deserializeAttachment'] = () => {
          return original.deserializeAttachment()?.wa
        }

        return deserializeAttachment
      }

      if (prop === 'send') {
        const send: WebSocket['send'] = (data) => {
          internal.closeIfExpired()
          return original.send(data)
        }

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

  return proxy as DurableEventIteratorWebsocket
}
