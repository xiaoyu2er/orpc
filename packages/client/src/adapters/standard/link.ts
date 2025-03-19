import type { Interceptor } from '@orpc/shared'
import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientContext, ClientLink, ClientOptionsOut } from '../../types'
import type { StandardLinkClient, StandardLinkCodec } from './types'
import { intercept } from '@orpc/shared'
import { type ClientPlugin, CompositeClientPlugin } from '../../plugins'

export class InvalidEventIteratorRetryResponse extends Error { }

export interface StandardLinkOptions<T extends ClientContext> {
  interceptors?: Interceptor<{ path: readonly string[], input: unknown, options: ClientOptionsOut<T> }, unknown, unknown>[]
  clientInterceptors?: Interceptor<{ request: StandardRequest }, StandardLazyResponse, unknown>[]
  plugins?: ClientPlugin<T>[]
}

export class StandardLink<T extends ClientContext> implements ClientLink<T> {
  private readonly interceptors: Exclude<StandardLinkOptions<T>['interceptors'], undefined>
  private readonly clientInterceptors: Exclude<StandardLinkOptions<T>['clientInterceptors'], undefined>

  constructor(
    public readonly codec: StandardLinkCodec<T>,
    public readonly sender: StandardLinkClient<T>,
    options: StandardLinkOptions<T>,
  ) {
    const plugin = new CompositeClientPlugin(options.plugins)

    plugin.init(options)

    this.interceptors = options.interceptors ?? []
    this.clientInterceptors = options.clientInterceptors ?? []
  }

  call(path: readonly string[], input: unknown, options: ClientOptionsOut<T>): Promise<unknown> {
    return intercept(this.interceptors, { path, input, options }, async ({ path, input, options }) => {
      const output = await this.#call(path, input, options)

      return output
    })
  }

  async #call(path: readonly string[], input: unknown, options: ClientOptionsOut<T>): Promise<unknown> {
    const request = await this.codec.encode(path, input, options)

    const response = await intercept(
      this.clientInterceptors,
      { request },
      ({ request }) => this.sender.call(request, options, path, input),
    )

    const output = await this.codec.decode(response, options, path, input)

    return output
  }
}
