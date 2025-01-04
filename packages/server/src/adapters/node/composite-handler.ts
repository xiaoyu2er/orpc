import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '../../types'
import type { ConditionalRequestHandler, RequestHandler, RequestOptions } from './types'

export class CompositeHandler<T extends Context> implements RequestHandler<T> {
  constructor(
    private readonly handlers: ConditionalRequestHandler<T>[],
  ) {}

  async handle<UReturnFalseOnNoMatch extends boolean = false>(
    req: IncomingMessage,
    res: ServerResponse,
    ...opt: [options: RequestOptions<T, UReturnFalseOnNoMatch>] | (undefined extends T ? [] : never)
  ): Promise<void | (true extends UReturnFalseOnNoMatch ? false : never)> {
    for (const handler of this.handlers) {
      if (handler.condition(req)) {
        return handler.handle(req, res, ...opt)
      }
    }

    if (opt[0]?.returnFalseOnNoMatch) {
      return false as any
    }

    res.statusCode = 404
    res.end('No handler found for the request.')
  }
}
