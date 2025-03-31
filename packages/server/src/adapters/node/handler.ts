import type { Interceptor, MaybeOptionalOptions, ThrowableError } from '@orpc/shared'
import type { NodeHttpRequest, NodeHttpResponse, SendStandardResponseOptions } from '@orpc/standard-server-node'
import type { Context } from '../../context'
import type { StandardHandleOptions, StandardHandler, StandardHandlerPlugin } from '../standard'
import { intercept, resolveMaybeOptionalOptions, toArray } from '@orpc/shared'
import { sendStandardResponse, toStandardLazyRequest } from '@orpc/standard-server-node'
import { type FriendlyStandardHandleOptions, resolveFriendlyStandardHandleOptions } from '../standard/utils'

export type NodeHttpHandleResult = { matched: true } | { matched: false }

export interface NodeHttpHandlerPlugin<T extends Context> extends StandardHandlerPlugin<T> {
  initRuntimeAdapter?(options: NodeHttpHandlerOptions<T>): void
}

export interface NodeHttpHandlerInterceptorOptions<T extends Context> extends StandardHandleOptions<T> {
  request: NodeHttpRequest
  response: NodeHttpResponse
  sendStandardResponseOptions: SendStandardResponseOptions
}

export interface NodeHttpHandlerOptions<T extends Context> extends SendStandardResponseOptions {
  adapterInterceptors?: Interceptor<NodeHttpHandlerInterceptorOptions<T>, NodeHttpHandleResult, ThrowableError>[]

  plugins?: NodeHttpHandlerPlugin<T>[]
}

export class NodeHttpHandler<T extends Context> implements NodeHttpHandler<T> {
  private readonly sendStandardResponseOptions: SendStandardResponseOptions
  private readonly adapterInterceptors: Exclude<NodeHttpHandlerOptions<T>['adapterInterceptors'], undefined>

  constructor(
    private readonly standardHandler: StandardHandler<T>,
      options: NoInfer<NodeHttpHandlerOptions<T>> = {},
  ) {
    for (const plugin of toArray(options.plugins)) {
      plugin.initRuntimeAdapter?.(options)
    }

    this.adapterInterceptors = toArray(options.adapterInterceptors)
    this.sendStandardResponseOptions = options
  }

  async handle(
    request: NodeHttpRequest,
    response: NodeHttpResponse,
    ...rest: MaybeOptionalOptions<FriendlyStandardHandleOptions<T>>
  ): Promise<NodeHttpHandleResult> {
    return intercept(
      this.adapterInterceptors,
      {
        ...resolveFriendlyStandardHandleOptions(resolveMaybeOptionalOptions(rest)),
        request,
        response,
        sendStandardResponseOptions: this.sendStandardResponseOptions,
      },
      async ({ request, response, sendStandardResponseOptions, ...options }) => {
        const standardRequest = toStandardLazyRequest(request, response)

        const result = await this.standardHandler.handle(standardRequest, options)

        if (!result.matched) {
          return { matched: false }
        }

        await sendStandardResponse(response, result.response, sendStandardResponseOptions)

        return { matched: true }
      },
    )
  }
}
