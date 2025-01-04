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

    return new Response('None of the handlers can handle the request.', {
      status: 404,
    })
  }
}
