import type { StandardRPCHandlerOptions } from '@orpc/server/standard'
import type {
  DurableEventIteratorObject as IDurableEventIteratorObject,
  DurableEventIteratorObjectDef as IDurableEventIteratorObjectDef,
  TokenAtt,
} from '../object'
import type { DurableEventIteratorObjectRouterContext } from './handler'
import type { DurableEventIteratorObjectState } from './object-state'
import type { EventResumeStorageOptions } from './resume-storage'
import { encodeHibernationRPCEvent, HibernationPlugin } from '@orpc/server/hibernation'
import { RPCHandler } from '@orpc/server/websocket'
import { toArray } from '@orpc/shared'
import { DurableObject } from 'cloudflare:workers'
import { DURABLE_EVENT_ITERATOR_TOKEN_PARAM } from '../consts'
import { parseToken } from '../schemas'
import { durableEventIteratorRouter } from './handler'
import { createDurableEventIteratorObjectState } from './object-state'
import { EventResumeStorage } from './resume-storage'
import { toDurableEventIteratorWebsocket } from './websocket'

export interface DurableEventIteratorObjectOptions
  extends StandardRPCHandlerOptions<DurableEventIteratorObjectRouterContext>,
  EventResumeStorageOptions {
}

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

export interface DurableEventIteratorObjectDef<
  TEventPayload extends object,
  TTokenAtt extends TokenAtt,
> extends IDurableEventIteratorObjectDef<TEventPayload, TTokenAtt> {
  handler: RPCHandler<DurableEventIteratorObjectRouterContext>
  resumeStorage: EventResumeStorage<TEventPayload>
  options: DurableEventIteratorObjectOptions
}

export class DurableEventIteratorObject<
  TEventPayload extends object,
  TTokenAttachment extends TokenAtt = TokenAtt,
  TEnv = unknown,
> extends DurableObject<TEnv> implements IDurableEventIteratorObject<TEventPayload, TTokenAttachment> {
  '~orpc': DurableEventIteratorObjectDef<TEventPayload, TTokenAttachment>

  protected override ctx: DurableEventIteratorObjectState

  constructor(
    ctx: DurableObjectState,
    env: TEnv,
    options: DurableEventIteratorObjectOptions = {},
  ) {
    super(ctx, env)

    this.ctx = createDurableEventIteratorObjectState(ctx)

    const resumeStorage = new EventResumeStorage<TEventPayload>(ctx, options)

    const handler = new RPCHandler(durableEventIteratorRouter, {
      ...options,
      plugins: [
        ...toArray(options.plugins),
        new HibernationPlugin(),
      ],
    })

    this['~orpc'] = {
      options,
      resumeStorage,
      handler,
    }
  }

  /**
   * Internally used to upgrade the WebSocket connection
   *
   * @warning No verification is done here, you should verify the token payload before calling this method.
   */
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const token = url.searchParams.getAll(DURABLE_EVENT_ITERATOR_TOKEN_PARAM).at(-1)
    const payload = parseToken(token)

    const { '0': client, '1': server } = new WebSocketPair()

    this.ctx.acceptWebSocket(server)
    toDurableEventIteratorWebsocket(server)['~orpc'].serializeTokenPayload(payload)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  /**
   * Internally used to handle WebSocket messages
   *
   * @info This method
   */
  override async webSocketMessage(websocket_: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const websocket = toDurableEventIteratorWebsocket(websocket_)

    websocket['~orpc'].closeIfExpired()
    if (websocket.readyState !== WebSocket.OPEN) {
      return
    }

    await this['~orpc'].handler.message(websocket, message, {
      context: {
        websocket,
        object: this,
        resumeStorage: this['~orpc'].resumeStorage,
        options: this['~orpc'].options,
      },
    })
  }

  override webSocketClose(websocket: WebSocket, _code: number, _reason: string, _wasClean: boolean): void | Promise<void> {
    this['~orpc'].handler.close(websocket)
  }

  /**
   * Publish an event to clients
   */
  publishEvent(payload: TEventPayload, options: PublishEventOptions = {}): void {
    const targets = options.targets?.map(ws => toDurableEventIteratorWebsocket(ws))
    const exclude = options.exclude?.map(ws => toDurableEventIteratorWebsocket(ws))

    this['~orpc'].resumeStorage.store(payload, { targets, exclude })

    const fallbackTargets = targets ?? this.ctx.getWebSockets().map(ws => toDurableEventIteratorWebsocket(ws))

    for (const ws of fallbackTargets) {
      if (exclude?.some(excluded => excluded['~orpc'].original === ws['~orpc'].original)) {
        continue
      }

      const hibernationId = ws['~orpc'].deserializeHibernationId()

      // Maybe the connection not finished the subscription process yet
      if (typeof hibernationId !== 'string') {
        continue
      }

      ws.send(encodeHibernationRPCEvent(hibernationId, payload, this['~orpc'].options))
    }
  }
}
