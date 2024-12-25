import type { Hooks } from '@orpc/shared'
import type { Router } from '../router'
import type { Context, WithSignal } from '../types'
import type { ConditionalFetchHandler, FetchOptions } from './types'
import { executeWithHooks, ORPC_HANDLER_HEADER, ORPC_HANDLER_VALUE, trim } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import { createProcedureClient } from '../procedure-client'
import { ORPCPayloadCodec, type PublicORPCPayloadCodec } from './orpc-payload-codec'
import { ORPCProcedureMatcher, type PublicORPCProcedureMatcher } from './orpc-procedure-matcher'

export type ORPCHandlerOptions<T extends Context> =
  & Hooks<Request, Response, T, WithSignal>
  & {
    procedureMatcher?: PublicORPCProcedureMatcher
    payloadCodec?: PublicORPCPayloadCodec
  }

export class ORPCHandler<T extends Context> implements ConditionalFetchHandler<T> {
  private readonly procedureMatcher: PublicORPCProcedureMatcher
  private readonly payloadCodec: PublicORPCPayloadCodec

  constructor(
    readonly router: Router<T, any>,
    readonly options?: NoInfer<ORPCHandlerOptions<T>>,
  ) {
    this.procedureMatcher = options?.procedureMatcher ?? new ORPCProcedureMatcher(router)
    this.payloadCodec = options?.payloadCodec ?? new ORPCPayloadCodec()
  }

  condition(request: Request): boolean {
    return Boolean(request.headers.get(ORPC_HANDLER_HEADER)?.includes(ORPC_HANDLER_VALUE))
  }

  async fetch(
    request: Request,
    ...[options]: [options: FetchOptions<T>] | (undefined extends T ? [] : never)
  ): Promise<Response> {
    const context = options?.context as T

    const execute = async () => {
      const url = new URL(request.url)
      const pathname = `/${trim(url.pathname.replace(options?.prefix ?? '', ''), '/')}`

      const match = await this.procedureMatcher.match(pathname)

      if (!match) {
        throw new ORPCError({ code: 'NOT_FOUND', message: 'Not found' })
      }

      const input = await this.payloadCodec.decode(request)

      const client = createProcedureClient({
        context,
        procedure: match.procedure,
        path: match.path,
      })

      const output = await client(input, { signal: options?.signal })

      const body = this.payloadCodec.encode(output)

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

      const body = this.payloadCodec.encode(error.toJSON())
      return new Response(body, {
        status: error.status,
      })
    }
  }
}
