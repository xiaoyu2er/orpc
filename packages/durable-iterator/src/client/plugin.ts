import type { ClientContext, ClientLink } from '@orpc/client'
import type { ClientRetryPluginContext } from '@orpc/client/plugins'
import type { StandardLinkInterceptorOptions, StandardLinkOptions, StandardLinkPlugin } from '@orpc/client/standard'
import type { RPCLinkOptions } from '@orpc/client/websocket'
import type { ContractRouterClient } from '@orpc/contract'
import type { Promisable, Value } from '@orpc/shared'
import type { DurableIteratorTokenPayload } from '../schemas'
import type { durableIteratorContract } from './contract'
import { createORPCClient } from '@orpc/client'
import { ClientRetryPlugin } from '@orpc/client/plugins'
import { RPCLink } from '@orpc/client/websocket'
import { AsyncIteratorClass, toArray, value } from '@orpc/shared'
import { WebSocket as ReconnectableWebSocket } from 'partysocket'
import { DURABLE_ITERATOR_PLUGIN_HEADER_KEY, DURABLE_ITERATOR_PLUGIN_HEADER_VALUE, DURABLE_ITERATOR_TOKEN_PARAM } from '../consts'
import { DurableIteratorError } from '../error'
import { parseDurableIteratorToken } from '../schemas'
import { createClientDurableIterator } from './iterator'

export interface DurableIteratorLinkPluginContext {
  isDurableIteratorResponse?: boolean
}

export interface DurableIteratorLinkPluginOptions<T extends ClientContext> extends Omit<RPCLinkOptions<object>, 'websocket'> {
  /**
   * The WebSocket URL to connect to the Durable Event Iterator Object.
   */
  url: Value<Promisable<string | URL>>

  /**
   * Determine whether to automatically refresh the token when it is expired.
   *
   * @default false
   */
  shouldRefreshTokenOnExpire?: Value<boolean, [tokenPayload: DurableIteratorTokenPayload, options: StandardLinkInterceptorOptions<T>]>
}

/**
 * @see {@link https://orpc.unnoq.com/docs/integrations/durable-event-iterator Durable Event Iterator Integration}
 */
export class DurableIteratorLinkPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  readonly CONTEXT_SYMBOL = Symbol('ORPC_DURABLE_ITERATOR_LINK_PLUGIN_CONTEXT')

  order = 2_100_000 // make sure execute before the batch plugin and after client retry plugin

  private readonly url: DurableIteratorLinkPluginOptions<T>['url']
  private readonly shouldRefreshTokenOnExpire: Exclude<DurableIteratorLinkPluginOptions<T>['shouldRefreshTokenOnExpire'], undefined>
  private readonly linkOptions: Omit<RPCLinkOptions<object>, 'websocket'>

  constructor({ url, shouldRefreshTokenOnExpire, ...options }: DurableIteratorLinkPluginOptions<T>) {
    this.url = url
    this.shouldRefreshTokenOnExpire = shouldRefreshTokenOnExpire ?? false
    this.linkOptions = options
  }

  init(options: StandardLinkOptions<T>): void {
    options.interceptors ??= []
    options.clientInterceptors ??= []

    options.interceptors.push(async (options) => {
      const pluginContext: DurableIteratorLinkPluginContext = {}

      const next = () => options.next({
        ...options,
        context: {
          [this.CONTEXT_SYMBOL]: pluginContext,
          ...options.context,
        },
      })

      const output = await next()

      if (!pluginContext.isDurableIteratorResponse) {
        return output
      }

      options?.signal?.throwIfAborted()

      let tokenAndPayload = this.validateToken(output, options.path)
      const websocket = new ReconnectableWebSocket(async () => {
        const notRoundedNowInSeconds = Date.now() / 1000
        const enabled = value(this.shouldRefreshTokenOnExpire, tokenAndPayload.payload, options)

        if (enabled && tokenAndPayload.payload.exp - notRoundedNowInSeconds <= 0) {
          const output = await next()
          tokenAndPayload = this.validateToken(output, options.path)
        }

        const url = new URL(await value(this.url))
        url.searchParams.append(DURABLE_ITERATOR_TOKEN_PARAM, tokenAndPayload.token)
        return url.toString()
      })

      const durableClient: ContractRouterClient<typeof durableIteratorContract, ClientRetryPluginContext>
        = createORPCClient(new RPCLink<ClientRetryPluginContext>({
          ...this.linkOptions,
          websocket,
          plugins: [
            ...toArray(this.linkOptions.plugins),
            new ClientRetryPlugin(),
          ],
        }))

      const closeConnection = () => {
        websocket.close()
      }

      options?.signal?.addEventListener('abort', closeConnection)

      const iterator_ = await durableClient.subscribe(undefined, {
        context: {
          retry: Number.POSITIVE_INFINITY,
        },
        lastEventId: options.lastEventId, // we can use user provided lastEventId for initial connection
      })
      const cancelableIterator = new AsyncIteratorClass(
        () => iterator_.next(),
        async () => {
          /**
           * Durable iterator design for long-lived connections
           * so if user trying to abort the iterator, we should close entire connection
           */
          closeConnection()
          /**
           * prevent memory leak in case signal is reused for another request
           */
          options.signal?.removeEventListener('abort', closeConnection)
        },
      )

      const link: ClientLink<object> = {
        call(path, input, options) {
          return durableClient.call({
            path: path as [string, ...string[]], // safely cast, server will validate later
            input,
          }, options)
        },
      }

      const durableIterator = createClientDurableIterator(
        cancelableIterator,
        link,
        {
          token: () => tokenAndPayload.token,
        },
      )

      return durableIterator
    })

    options.clientInterceptors.push(async (options) => {
      const pluginContext = options.context[this.CONTEXT_SYMBOL] as DurableIteratorLinkPluginContext | undefined

      if (!pluginContext) {
        throw new DurableIteratorError('Plugin context has been corrupted or modified by another plugin or interceptor')
      }

      const response = await options.next()

      pluginContext.isDurableIteratorResponse = response.headers[DURABLE_ITERATOR_PLUGIN_HEADER_KEY] === DURABLE_ITERATOR_PLUGIN_HEADER_VALUE

      return response
    })
  }

  private validateToken(token: unknown, path: readonly string[]): { token: string, payload: DurableIteratorTokenPayload } {
    if (typeof token !== 'string') {
      throw new DurableIteratorError(`Expected valid token for procedure ${path.join('.')}`)
    }

    try {
      return { token, payload: parseDurableIteratorToken(token) }
    }
    catch (error) {
      throw new DurableIteratorError(`Expected valid token for procedure ${path.join('.')}`, { cause: error })
    }
  }
}
