import type { Context } from '../../types'
import type { ConditionalFetchHandler, FetchHandler, FetchOptions } from './types'

export class CompositeHandler<T extends Context> implements FetchHandler<T> {
  constructor(
    private readonly handlers: ConditionalFetchHandler<T>[],
  ) {}

  async fetch<UReturnFalseOnNoMatch extends boolean = false>(
    request: Request,
    ...opt: [options: FetchOptions<T, UReturnFalseOnNoMatch>] | (undefined extends T ? [] : never)
  ): Promise<Response | (true extends UReturnFalseOnNoMatch ? false : never)> {
    for (const handler of this.handlers) {
      if (handler.condition(request)) {
        return handler.fetch(request, ...opt)
      }
    }

    if (opt[0]?.returnFalseOnNoMatch) {
      return false as any
    }

    return new Response('No handler found for the request.', {
      status: 404,
    })
  }
}
