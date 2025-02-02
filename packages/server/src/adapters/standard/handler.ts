import type { HTTPPath } from '@orpc/contract'
import type { Interceptable } from '@orpc/shared'
import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardCodec, StandardMatcher, StandardRequest, StandardResponse } from './types'
import { ORPCError } from '@orpc/contract'
import { intercept, trim } from '@orpc/shared'
import { createProcedureClient } from '../../procedure-client'

export type FetchHandleOptions<T extends Context> =
  & { prefix?: HTTPPath }
  & (Record<never, never> extends T ? { context?: T } : { context: T })

export type StandardHandleRest<T extends Context> =
  | [options: FetchHandleOptions<T>]
  | (Record<never, never> extends T ? [] : never)

export type StandardHandleResult = { matched: true, response: StandardResponse } | { matched: false, response: undefined }

export interface StandardHandlerOptions<TContext extends Context> extends Interceptable<
  { context: TContext, request: StandardRequest },
  StandardHandleResult,
  unknown
> {
}

export class StandardHandler<TContext extends Context> {
  constructor(
    router: Router<TContext, any>,
    private readonly matcher: StandardMatcher,
    private readonly codec: StandardCodec,
    private readonly options: NoInfer<StandardHandlerOptions<TContext>> = {},
  ) {
    this.matcher.init(router)
  }

  async handle(request: StandardRequest, ...[options]: StandardHandleRest<TContext>): Promise<StandardHandleResult> {
    try {
      return await intercept(
        this.options,
        { request, context: options?.context ?? {} as TContext },
        async ({ request, context }) => {
          const method = request.method
          const url = request.url
          const pathname = `/${trim(url.pathname.replace(options?.prefix ?? '', ''), '/')}`

          const match = await this.matcher.match(method, pathname)

          if (!match) {
            return { matched: false, response: undefined }
          }

          const input = await this.codec.decode(request, match.params, match.procedure)

          const client = createProcedureClient(match.procedure, {
            context,
            path: match.path,
          })

          const output = await client(input, { signal: request.signal })

          const response = this.codec.encode(output, match.procedure)

          return {
            matched: true,
            response,
          }
        },
      )
    }
    catch (e) {
      const error = e instanceof ORPCError
        ? e
        : new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Internal server error',
          cause: e,
        })

      const response = this.codec.encodeError(error)

      return {
        matched: true,
        response,
      }
    }
  }
}
