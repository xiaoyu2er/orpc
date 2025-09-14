import type { ClientContext, ClientLink } from '@orpc/client'
import type { ClientRetryPluginContext } from '@orpc/client/plugins'
import type { StandardLinkOptions, StandardLinkPlugin } from '@orpc/client/standard'
import type { RPCLinkOptions } from '@orpc/client/websocket'
import type { ContractRouterClient } from '@orpc/contract'
import type { Promisable, Value } from '@orpc/shared'
import type { TokenPayload } from '../schemas'
import type { DurableIteratorContract } from './contract'
import { createORPCClient } from '@orpc/client'
import { ClientRetryPlugin } from '@orpc/client/plugins'
import { RPCLink } from '@orpc/client/websocket'
import { AsyncIteratorClass, toArray, value } from '@orpc/shared'
import { WebSocket as ReconnectableWebSocket } from 'partysocket'
import { DURABLE_ITERATOR_PLUGIN_HEADER_KEY, DURABLE_ITERATOR_PLUGIN_HEADER_VALUE, DURABLE_ITERATOR_TOKEN_PARAM } from '../consts'
import { DurableIteratorError } from '../error'
import { parseToken } from '../schemas'
import { createClientDurableIterator } from './event-iterator'

export interface DurableIteratorLinkPluginContext {
  isDurableIteratorResponse?: boolean
}

export interface DurableIteratorLinkPluginOptions extends Omit<RPCLinkOptions<object>, 'websocket'> {
  /**
   * The WebSocket URL to connect to the Durable Event Iterator Object.
   */
  url: Value<Promisable<string | URL>>
}

/**
 * @see {@link https://orpc.unnoq.com/docs/integrations/durable-event-iterator Durable Event Iterator Integration}
 */
export class DurableIteratorLinkPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  readonly CONTEXT_SYMBOL = Symbol('ORPC_DURABLE_ITERATOR_LINK_PLUGIN_CONTEXT')

  order = 2_100_000 // make sure execute before the batch plugin and after client retry plugin

  private readonly url: DurableIteratorLinkPluginOptions['url']
  private readonly linkOptions: Omit<RPCLinkOptions<object>, 'websocket'>

  constructor({ url, ...options }: DurableIteratorLinkPluginOptions) {
    this.url = url
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

        if (tokenAndPayload.payload.exp - notRoundedNowInSeconds <= 0) {
          const output = await next()
          tokenAndPayload = this.validateToken(output, options.path)
        }

        const url = new URL(await value(this.url))
        url.searchParams.append(DURABLE_ITERATOR_TOKEN_PARAM, tokenAndPayload.token)
        return url.toString()
      })

      const durableClient: ContractRouterClient<typeof DurableIteratorContract, ClientRetryPluginContext>
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
          // should be a function because token and payload can change over time
          token: () => tokenAndPayload.token,
        },
      )

      return durableIterator
    })

    options.clientInterceptors.push(async (options) => {
      const pluginContext = options.context[this.CONTEXT_SYMBOL] as DurableIteratorLinkPluginContext | undefined

      if (!pluginContext) {
        throw new TypeError('[DurableIteratorLinkPlugin] Plugin context has been corrupted or modified by another plugin or interceptor')
      }

      const response = await options.next()

      pluginContext.isDurableIteratorResponse = response.headers[DURABLE_ITERATOR_PLUGIN_HEADER_KEY] === DURABLE_ITERATOR_PLUGIN_HEADER_VALUE

      return response
    })
  }

  private validateToken(token: unknown, path: readonly string[]): { token: string, payload: TokenPayload } {
    if (typeof token !== 'string') {
      throw new DurableIteratorError(`Expected valid token for procedure ${path.join('.')}`)
    }

    try {
      return { token, payload: parseToken(token) }
    }
    catch (error) {
      throw new DurableIteratorError(`Expected valid token for procedure ${path.join('.')}`, { cause: error })
    }
  }
}
