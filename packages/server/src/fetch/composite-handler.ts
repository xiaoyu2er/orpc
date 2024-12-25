import type { Context } from '../types'
import type { ConditionalFetchHandler, FetchOptions } from './types'

export class CompositeHandler<T extends Context> implements ConditionalFetchHandler<T> {
  constructor(
    private readonly handlers: ConditionalFetchHandler<T>[],
  ) {}

  condition(): boolean {
    return true
  }

  async fetch(
    request: Request,
    ...opt: [options: FetchOptions<T>] | (undefined extends T ? [] : never)
  ): Promise<Response> {
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
