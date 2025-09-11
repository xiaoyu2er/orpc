import type { ClientContext, ClientLink } from '@orpc/client'
import type { ClientRetryPluginContext } from '@orpc/client/plugins'
import type { StandardLinkOptions, StandardLinkPlugin } from '@orpc/client/standard'
import type { RPCLinkOptions } from '@orpc/client/websocket'
import type { ContractRouterClient } from '@orpc/contract'
import type { Promisable, Value } from '@orpc/shared'
import type { durableEventIteratorContract } from './contract'
import { createORPCClient } from '@orpc/client'
import { ClientRetryPlugin } from '@orpc/client/plugins'
import { RPCLink } from '@orpc/client/websocket'
import { AsyncIteratorClass, toArray, value } from '@orpc/shared'
import { WebSocket as ReconnectableWebSocket } from 'partysocket'
import { DURABLE_EVENT_ITERATOR_PLUGIN_HEADER_KEY, DURABLE_EVENT_ITERATOR_PLUGIN_HEADER_VALUE, DURABLE_EVENT_ITERATOR_TOKEN_PARAM } from '../consts'
import { createClientDurableEventIterator } from './event-iterator'

export interface DurableEventIteratorLinkPluginContext {
  isDurableEventIteratorResponse?: boolean
}

export interface DurableEventIteratorLinkPluginOptions extends Omit<RPCLinkOptions<object>, 'websocket'> {
  /**
   * The WebSocket URL to connect to the Durable Event Iterator Object.
   */
  url: Value<Promisable<string | URL>>
}

/**
 * @see {@link https://orpc.unnoq.com/docs/integrations/durable-event-iterator Durable Event Iterator Integration}
 */
export class DurableEventIteratorLinkPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  readonly CONTEXT_SYMBOL = Symbol('ORPC_DURABLE_EVENT_ITERATOR_LINK_PLUGIN_CONTEXT')

  order = 2_100_000 // make sure execute before the batch plugin and after client retry plugin

  private readonly url: DurableEventIteratorLinkPluginOptions['url']
  private readonly linkOptions: Omit<RPCLinkOptions<object>, 'websocket'>

  constructor({ url, ...options }: DurableEventIteratorLinkPluginOptions) {
    this.url = url
    this.linkOptions = options
  }

  init(options: StandardLinkOptions<T>): void {
    options.interceptors ??= []
    options.clientInterceptors ??= []

    options.interceptors.push(async (options) => {
      const pluginContext: DurableEventIteratorLinkPluginContext = {}

      const output = await options.next({
        ...options,
        context: {
          [this.CONTEXT_SYMBOL]: pluginContext,
          ...options.context,
        },
      })

      if (!pluginContext.isDurableEventIteratorResponse) {
        return output
      }

      options?.signal?.throwIfAborted()

      const token = output as string
      const url = new URL(await value(this.url))
      url.searchParams.append(DURABLE_EVENT_ITERATOR_TOKEN_PARAM, token)

      const websocket = new ReconnectableWebSocket(url.toString())

      options?.signal?.addEventListener('abort', () => {
        websocket.close()
      })

      const durableLink = new RPCLink<ClientRetryPluginContext>({
        ...this.linkOptions,
        websocket,
        plugins: [
          ...toArray(this.linkOptions.plugins),
          new ClientRetryPlugin(),
        ],
      })

      const durableClient: ContractRouterClient<typeof durableEventIteratorContract, ClientRetryPluginContext> = createORPCClient(durableLink)

      const iterator = await durableClient.subscribe(undefined, {
        context: {
          retry: Number.POSITIVE_INFINITY,
        },
      })

      const cancelableIterator = new AsyncIteratorClass(
        () => iterator.next(),
        async () => {
          /**
           * Durable iterator design for long-lived connections
           * so if user trying to abort the iterator, we should close entire connection
           */
          websocket.close()
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

      const durableIterator = createClientDurableEventIterator(cancelableIterator, link, {
        token,
      })

      return durableIterator
    })

    options.clientInterceptors.push(async (options) => {
      const pluginContext = options.context[this.CONTEXT_SYMBOL] as DurableEventIteratorLinkPluginContext | undefined

      if (!pluginContext) {
        throw new TypeError('[DurableEventIteratorLinkPlugin] Plugin context has been corrupted or modified by another plugin or interceptor')
      }

      const response = await options.next()

      pluginContext.isDurableEventIteratorResponse = response.headers[DURABLE_EVENT_ITERATOR_PLUGIN_HEADER_KEY] === DURABLE_EVENT_ITERATOR_PLUGIN_HEADER_VALUE

      return response
    })
  }
}
