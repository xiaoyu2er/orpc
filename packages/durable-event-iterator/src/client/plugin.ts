import type { ClientRetryPluginContext } from '@orpc/client/plugins'
import type { StandardLinkOptions, StandardLinkPlugin } from '@orpc/client/standard'
import type { ContractRouterClient } from '@orpc/contract'
import type { durableEventIteratorContract } from './contract'
import { type ClientContext, createORPCClient } from '@orpc/client'
import { ClientRetryPlugin } from '@orpc/client/plugins'
import { experimental_RPCLink as RPCLink } from '@orpc/client/websocket'
import { WebSocket as ReconnectableWebSocket } from 'partysocket'
import { DURABLE_EVENT_ITERATOR_JWT_PARAM, DURABLE_EVENT_ITERATOR_PLUGIN_HEADER_KEY, DURABLE_EVENT_ITERATOR_PLUGIN_HEADER_VALUE } from '../consts'
import { createClientDurableEventIterator as crateClientDurableEventIterator } from './event-iterator'

export interface DurableEventIteratorLinkPluginContext {
  isDurableEventIteratorResponse?: boolean
}

export interface DurableEventIteratorLinkPluginOptions {
  /**
   * The WebSocket URL to connect to the Durable Event Iterator Object.
   */
  url: string | URL

  /**
   * Polyfill for WebSocket construction.
   */
  WebSocket?: typeof WebSocket
}

/**
 * @see {@link https://orpc.unnoq.com/docs/integrations/durable-event-iterator Durable Event Iterator Integration}
 */
export class DurableEventIteratorLinkPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  readonly CONTEXT_SYMBOL = Symbol('ORPC_DURABLE_EVENT_ITERATOR_LINK_PLUGIN_CONTEXT')

  order = 2_100_000 // make sure execute after the batch plugin

  readonly #url: DurableEventIteratorLinkPluginOptions['url']
  readonly #WebSocket: DurableEventIteratorLinkPluginOptions['WebSocket']

  constructor(options: DurableEventIteratorLinkPluginOptions) {
    this.#url = options.url
    this.#WebSocket = options.WebSocket
  }

  init(options: StandardLinkOptions<T>): void {
    options.interceptors ??= []
    options.clientInterceptors ??= []

    options.interceptors.unshift(async (options) => {
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

      const jwt = output as string
      const url = new URL(this.#url)
      url.searchParams.append(DURABLE_EVENT_ITERATOR_JWT_PARAM, jwt)

      const durableLink = new RPCLink<ClientRetryPluginContext>({
        websocket: new ReconnectableWebSocket(url.toString(), undefined, {
          WebSocket: this.#WebSocket,
        }),
        plugins: [
          new ClientRetryPlugin(),
        ],
      })

      const durableClient: ContractRouterClient<typeof durableEventIteratorContract, ClientRetryPluginContext> = createORPCClient(durableLink)

      const iterator = await durableClient.subscribe(undefined, {
        context: {
          retry: Number.POSITIVE_INFINITY,
        },
      })

      const durableIterator = crateClientDurableEventIterator(iterator, {
        jwt,
      })

      return durableIterator
    })

    options.clientInterceptors.unshift(async (options) => {
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
