import type { NodeHttpRequest, NodeHttpResponse, SendStandardResponseOptions } from '@orpc/standard-server-node'
import type { Context } from '../../context'
import type { HandlerPlugin } from '../../plugins'
import type { StandardHandleOptions, StandardHandler } from '../standard'
import { intercept, type Interceptor, type MaybeOptionalOptions, resolveMaybeOptionalOptions, toArray } from '@orpc/shared'
import { sendStandardResponse, toStandardLazyRequest } from '@orpc/standard-server-node'
import { type FriendlyStandardHandleOptions, resolveFriendlyStandardHandleOptions } from '../standard/utils'

export type NodeHttpHandleResult = { matched: true } | { matched: false }

export interface NodeHttpHandlerPlugin<T extends Context> extends HandlerPlugin<T> {
  initRuntimeAdapter?(options: NodeHttpHandlerOptions<T>): void
}

export interface NodeHttpHandlerOptions<T extends Context> extends SendStandardResponseOptions {
  adapterInterceptors?: Interceptor<
    { request: NodeHttpRequest, response: NodeHttpResponse, sendStandardResponseOptions: SendStandardResponseOptions, options: StandardHandleOptions<T> },
    NodeHttpHandleResult,
    unknown
  >[]

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
        request,
        response,
        sendStandardResponseOptions: this.sendStandardResponseOptions,
        options: resolveFriendlyStandardHandleOptions(resolveMaybeOptionalOptions(rest)),
      },
      async ({ request, response, sendStandardResponseOptions, options }) => {
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
