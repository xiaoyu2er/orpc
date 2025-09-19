import type { Client } from '@orpc/client'
import type { RPCHandlerOptions } from '@orpc/server/websocket'
import type { DurableObject } from 'cloudflare:workers'
import type { DurableIteratorObjectDef } from '../object'
import type { DurableIteratorObjectState } from './object-state'
import type { EventResumeStorageOptions } from './resume-storage'
import type { DurableIteratorWebsocket } from './websocket'
import { implement, ORPCError } from '@orpc/server'
import { encodeHibernationRPCEvent, HibernationEventIterator, HibernationPlugin } from '@orpc/server/hibernation'
import { RPCHandler } from '@orpc/server/websocket'
import { get, toArray } from '@orpc/shared'
import { DURABLE_ITERATOR_TOKEN_PARAM } from '../consts'
import { durableIteratorContract } from '../contract'
import { parseDurableIteratorToken } from '../schemas'
import { toDurableIteratorObjectState } from './object-state'
import { EventResumeStorage } from './resume-storage'
import { toDurableIteratorWebsocket } from './websocket'

const os = implement(durableIteratorContract)

type DurableIteratorObjectRouterContext = {
  object: DurableObject<any>
  resumeStorage: EventResumeStorage<any>
  websocket: DurableIteratorWebsocket
  options: DurableIteratorObjectHandlerOptions
}

const base = os.$context<DurableIteratorObjectRouterContext>()

const router = base.router({
  subscribe: base.subscribe.handler(({ context, lastEventId }) => {
    return new HibernationEventIterator<any>((hibernationId) => {
      context.websocket['~orpc'].serializeHibernationId(hibernationId)

      if (typeof lastEventId === 'string') {
        const resumePayloads = context.resumeStorage.get(context.websocket, lastEventId)
        for (const payload of resumePayloads) {
          context.websocket.send(
            encodeHibernationRPCEvent(hibernationId, payload, context.options),
          )
        }
      }

      context.options.onSubscribed?.(context.websocket, lastEventId)
    })
  }),

  call: base.call.handler(({ context, input, signal, lastEventId }) => {
    const allowMethods = context.websocket['~orpc'].deserializeTokenPayload().rpc
    const [method, ...path] = input.path

    if (!allowMethods?.includes(method)) {
      throw new ORPCError('FORBIDDEN', {
        message: `Method "${method}" is not allowed.`,
      })
    }

    const nestedClient = (context.object as any)[method](context.websocket)

    const client = get(nestedClient, path) as Client<any, any, any, any>

    return client(input.input, { signal, lastEventId })
  }),
})

export interface PublishEventOptions {
  /**
   * Restrict the event to a specific set of websockets.
   *
   * Use this when security is important — only the listed websockets
   * will ever receive the event. Newly connected websockets are not
   * included unless explicitly added here.
   */
  targets?: WebSocket[]

  /**
   * Exclude certain websockets from receiving the event.
   *
   * Use this when broadcasting widely but skipping a few clients
   * (e.g., the sender). Newly connected websockets may still receive
   * the event if not listed here, so this is less strict than `targets`.
   */
  exclude?: WebSocket[]
}

export interface DurableIteratorObjectHandlerOptions extends RPCHandlerOptions<DurableIteratorObjectRouterContext>, EventResumeStorageOptions {
  /**
   * Called after a client successfully subscribes to the main iterator.
   * You can start sending events to the client here.
   *
   * @param websocket Corresponding WebSocket connection.
   * @param lastEventId Can be `undefined` if this is the first connection (not a resumed session).
   */
  onSubscribed?: (websocket: DurableIteratorWebsocket, lastEventId: string | undefined) => void
}

export class DurableIteratorObjectHandler<
  T extends object,
> implements DurableIteratorObjectDef<T> {
  '~eventPayloadType'?: { type: T } // Helps DurableIteratorObjectDef infer the type

  private readonly handler: RPCHandler<DurableIteratorObjectRouterContext>
  private readonly resumeStorage: EventResumeStorage<T>

  /**
   * Proxied, ensure you don't accidentally change internal state
   */
  ctx: DurableIteratorObjectState

  constructor(
    ctx: DurableObjectState,
    private readonly object: DurableObject<any>,
    private readonly options: DurableIteratorObjectHandlerOptions = {},
  ) {
    this.ctx = toDurableIteratorObjectState(ctx)

    this.resumeStorage = new EventResumeStorage<T>(ctx, options)

    this.handler = new RPCHandler(router, {
      ...options,
      plugins: [
        ...toArray(options.plugins),
        new HibernationPlugin(),
      ],
    })

    /**
     * Optional, but this's a good place to do it as soon as they expire.
     */
    this.ctx.getWebSockets().forEach(ws => ws['~orpc'].closeIfExpired())
  }

  /**
   * Publish an event to a set of clients.
   */
  publishEvent(payload: T, options: PublishEventOptions = {}): void {
    const targets = options.targets?.map(ws => toDurableIteratorWebsocket(ws))
    const exclude = options.exclude?.map(ws => toDurableIteratorWebsocket(ws))

    // update payload metadata
    payload = this.resumeStorage.store(payload, { targets, exclude })

    const excludeIds = exclude?.map(ws => ws['~orpc'].deserializeTokenPayload().id)
    const fallbackTargets = targets ?? this.ctx.getWebSockets().map(ws => toDurableIteratorWebsocket(ws))

    for (const ws of fallbackTargets) {
      if (excludeIds?.includes(ws['~orpc'].deserializeTokenPayload().id)) {
        continue
      }

      const hibernationId = ws['~orpc'].deserializeHibernationId()

      // Maybe the connection not finished the subscription process yet
      if (typeof hibernationId !== 'string') {
        continue
      }

      const data = encodeHibernationRPCEvent(hibernationId, payload, this.options)

      try {
        ws.send(data)
      }
      catch {
        // ignore sending errors (probably already closed or expired)
      }
    }
  }

  /**
   * This method is called when a HTTP request is received for upgrading to a WebSocket connection.
   * Should mapping with corresponding `fetch` inside durable object
   *
   * @warning No verification is done here, you should verify the token payload before calling this method.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const token = url.searchParams.getAll(DURABLE_ITERATOR_TOKEN_PARAM).at(-1)
    const payload = parseDurableIteratorToken(token)

    const { '0': client, '1': server } = new WebSocketPair()

    this.ctx.acceptWebSocket(server)
    toDurableIteratorWebsocket(server)['~orpc'].serializeTokenPayload(payload)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  /**
   * This method is called when a WebSocket message is received.
   * Should mapping with corresponding `webSocketMessage` inside durable object
   */
  async webSocketMessage(websocket_: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const websocket = toDurableIteratorWebsocket(websocket_)

    websocket['~orpc'].closeIfExpired()
    if (websocket.readyState !== WebSocket.OPEN) {
      return
    }

    // `websocket` auto close if expired on every send
    await this.handler.message(websocket, message, {
      context: {
        websocket,
        object: this.object,
        resumeStorage: this.resumeStorage,
        options: this.options,
      },
    })
  }

  /**
   * This method is called when a WebSocket connection is closed.
   * Should mapping with corresponding `webSocketClose` inside durable object
   */
  webSocketClose(websocket: WebSocket, _code: number, _reason: string, _wasClean: boolean): void | Promise<void> {
    this.handler.close(websocket)
  }
}
