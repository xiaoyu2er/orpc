import type { Hooks } from '@orpc/shared'
import type { Router } from '../router'
import type { Context, WithSignal } from '../types'
import type { FetchHandler, FetchOptions } from './types'
import { executeWithHooks, trim } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import { createProcedureClient } from '../procedure-client'
import { ORPCCodec } from './orpc-codec'
import { ORPCMatcher } from './orpc-matcher'

export type ORPCHandlerOptions<T extends Context> =
  & Hooks<Request, Response, T, WithSignal>
  & {
    matcher?: ORPCMatcher
    codec?: ORPCCodec
  }

export class ORPCHandler<T extends Context> implements FetchHandler<T> {
  private readonly matcher: ORPCMatcher
  private readonly codec: ORPCCodec

  constructor(
    readonly router: Router<T, any>,
    readonly options?: NoInfer<ORPCHandlerOptions<T>>,
  ) {
    this.matcher = options?.matcher ?? new ORPCMatcher(router)
    this.codec = new ORPCCodec()
  }

  async fetch(
    request: Request,
    ...[options]: [options: FetchOptions<T>] | (undefined extends T ? [] : never)
  ): Promise<Response> {
    const context = options?.context as T

    const execute = async () => {
      const url = new URL(request.url)
      const pathname = `/${trim(url.pathname.replace(options?.prefix ?? '', ''), '/')}`

      const match = await this.matcher.match(pathname)

      if (!match) {
        throw new ORPCError({ code: 'NOT_FOUND', message: 'Not found' })
      }

      const input = await this.decodeInput(request)

      const client = createProcedureClient({
        context,
        procedure: match.procedure,
        path: match.path,
      })

      const output = await client(input, { signal: options?.signal })

      const body = this.codec.encode(output)

      return new Response(body)
    }

    try {
      return await executeWithHooks({
        context,
        execute,
        input: request,
        hooks: this.options,
        meta: {
          signal: options?.signal,
        },
      })
    }
    catch (e) {
      const error = e instanceof ORPCError
        ? e
        : new ORPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          cause: e,
        })

      const body = this.codec.encode(error.toJSON())
      return new Response(body, {
        status: error.status,
      })
    }
  }

  private async decodeInput(request: Request): Promise<unknown> {
    try {
      return await this.codec.decode(request)
    }
    catch (e) {
      throw new ORPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot parse request. Please check the request body and Content-Type header.',
        cause: e,
      })
    }
  }
}
