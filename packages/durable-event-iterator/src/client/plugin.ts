import type { ClientRetryPluginContext } from '@orpc/client/plugins'
import type { StandardLinkOptions, StandardLinkPlugin } from '@orpc/client/standard'
import type { RouterClient } from '@orpc/server'
import type { durableEventIteratorObjectRouter } from '../object'
import { type ClientContext, createORPCClient } from '@orpc/client'
import { ClientRetryPlugin } from '@orpc/client/plugins'
import { experimental_RPCLink as RPCLink } from '@orpc/client/websocket'
import { experimental_createClientDurableEventIterator as crateClientDurableEventIterator } from './event-iterator'

export interface experimental_DurableEventIteratorLinkPluginContext {
  isDurableEventIteratorResponse?: boolean
}

export interface experimental_DurableEventIteratorLinkPluginOptions {
  /**
   * The WebSocket URL to connect to the Durable Event Iterator Object.
   */
  url: string | URL
}

/**
 * @see {@link https://orpc.unnoq.com/docs/integrations/durable-event-iterator Durable Event Iterator Integration}
 */
export class experimental_DurableEventIteratorLinkPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  readonly CONTEXT_SYMBOL = Symbol('ORPC_DURABLE_EVENT_ITERATOR_LINK_PLUGIN_CONTEXT')

  order = 2_100_000 // make sure execute after the batch plugin

  readonly #url: experimental_DurableEventIteratorLinkPluginOptions['url']

  constructor(options: experimental_DurableEventIteratorLinkPluginOptions) {
    this.#url = options.url
  }

  init(options: StandardLinkOptions<T>): void {
    options.interceptors ??= []
    options.clientInterceptors ??= []

    options.interceptors.unshift(async (options) => {
      const pluginContext: experimental_DurableEventIteratorLinkPluginContext = {}

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
      url.searchParams.append('jwt', jwt)

      const durableLink = new RPCLink<ClientRetryPluginContext>({
        websocket: new WebSocket(url),
        plugins: [
          new ClientRetryPlugin(),
        ],
      })

      const durableClient: RouterClient<typeof durableEventIteratorObjectRouter, ClientRetryPluginContext> = createORPCClient(durableLink)

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
      const pluginContext = options.context[this.CONTEXT_SYMBOL] as experimental_DurableEventIteratorLinkPluginContext | undefined

      if (!pluginContext) {
        throw new TypeError('[DurableEventIteratorLinkPlugin] Plugin context has been corrupted or modified by another plugin or interceptor')
      }

      const response = await options.next()

      pluginContext.isDurableEventIteratorResponse = response.headers['x-orpc-durable-event-iterator'] === '1'

      return response
    })
  }
}
