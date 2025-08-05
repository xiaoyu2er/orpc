import type { Interceptor } from '@orpc/shared'
import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientContext, ClientLink, ClientOptions } from '../../types'
import type { StandardLinkPlugin } from './plugin'
import type { StandardLinkClient, StandardLinkCodec } from './types'
import { asyncIteratorWithSpan, intercept, isAsyncIteratorObject, ORPC_NAME, runWithSpan, toArray } from '@orpc/shared'
import { CompositeStandardLinkPlugin } from './plugin'

export interface StandardLinkInterceptorOptions<T extends ClientContext> extends ClientOptions<T> {
  path: readonly string[]
  input: unknown
}

export interface StandardLinkClientInterceptorOptions<T extends ClientContext> extends StandardLinkInterceptorOptions<T> {
  request: StandardRequest
}

export interface StandardLinkOptions<T extends ClientContext> {
  interceptors?: Interceptor<StandardLinkInterceptorOptions<T>, Promise<unknown>>[]
  clientInterceptors?: Interceptor<StandardLinkClientInterceptorOptions<T>, Promise<StandardLazyResponse>>[]
  plugins?: StandardLinkPlugin<T>[]
}

export class StandardLink<T extends ClientContext> implements ClientLink<T> {
  private readonly interceptors: Exclude<StandardLinkOptions<T>['interceptors'], undefined>
  private readonly clientInterceptors: Exclude<StandardLinkOptions<T>['clientInterceptors'], undefined>

  constructor(
    public readonly codec: StandardLinkCodec<T>,
    public readonly sender: StandardLinkClient<T>,
    options: StandardLinkOptions<T> = {},
  ) {
    const plugin = new CompositeStandardLinkPlugin(options.plugins)

    plugin.init(options)

    this.interceptors = toArray(options.interceptors)
    this.clientInterceptors = toArray(options.clientInterceptors)
  }

  call(path: readonly string[], input: unknown, options: ClientOptions<T>): Promise<unknown> {
    /**
     * [Semantic conventions for RPC spans](https://opentelemetry.io/docs/specs/semconv/rpc/rpc-spans/)
     */
    return runWithSpan(
      { name: `${ORPC_NAME}.${path.join('/')}`, signal: options.signal },
      (span) => {
        span?.setAttribute('rpc.system', ORPC_NAME)
        span?.setAttribute('rpc.method', path.join('.'))

        options.signal?.addEventListener('abort', () => {
          span?.addEvent('abort', { reason: String(options.signal?.reason) })
        })

        if (isAsyncIteratorObject(input)) {
          input = asyncIteratorWithSpan(
            { name: 'consume_event_iterator_input', signal: options.signal },
            input,
          )
        }

        return intercept(this.interceptors, { ...options, path, input }, async ({ path, input, ...options }) => {
          const output = await this.#call(path, input, options)

          return output
        })
      },
    )
  }

  async #call(path: readonly string[], input: unknown, options: ClientOptions<T>): Promise<unknown> {
    const request = await runWithSpan(
      { name: 'encode_request' },
      () => this.codec.encode(path, input, options),
    )

    const response = await intercept(
      this.clientInterceptors,
      { ...options, input, path, request },
      ({ input, path, request, ...options }) => {
        return runWithSpan(
          { name: 'send_request', signal: options.signal },
          () => this.sender.call(request, options, path, input),
        )
      },
    )

    const output = await runWithSpan(
      { name: 'decode_response' },
      () => this.codec.decode(response, options, path, input),
    )

    if (isAsyncIteratorObject(output)) {
      return asyncIteratorWithSpan(
        { name: 'consume_event_iterator_output', signal: options.signal },
        output,
      )
    }

    return output
  }
}
