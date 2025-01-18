import type { Hooks } from '@orpc/shared'
import type { Context } from '../../context'
import type { Router } from '../../router'
import type { FetchHandler, FetchHandleRest, FetchHandleResult } from './types'
import { ORPCError } from '@orpc/contract'
import { executeWithHooks, trim } from '@orpc/shared'
import { createProcedureClient } from '../../procedure-client'
import { ORPCPayloadCodec, type PublicORPCPayloadCodec } from './orpc-payload-codec'
import { ORPCProcedureMatcher, type PublicORPCProcedureMatcher } from './orpc-procedure-matcher'

export type RPCHandlerOptions<T extends Context> =
  & Hooks<Request, FetchHandleResult, T, { signal?: AbortSignal }>
  & {
    procedureMatcher?: PublicORPCProcedureMatcher
    payloadCodec?: PublicORPCPayloadCodec
  }

export class RPCHandler<T extends Context> implements FetchHandler<T> {
  private readonly procedureMatcher: PublicORPCProcedureMatcher
  private readonly payloadCodec: PublicORPCPayloadCodec

  constructor(router: Router<T, any>, private readonly options?: NoInfer<RPCHandlerOptions<T>>) {
    this.procedureMatcher = options?.procedureMatcher ?? new ORPCProcedureMatcher(router)
    this.payloadCodec = options?.payloadCodec ?? new ORPCPayloadCodec()
  }

  async handle(request: Request, ...[options]: FetchHandleRest<T>): Promise<FetchHandleResult> {
    const context = options?.context ?? {} as T

    const execute = async (): Promise<FetchHandleResult> => {
      const url = new URL(request.url)
      const pathname = `/${trim(url.pathname.replace(options?.prefix ?? '', ''), '/')}`
      const match = await this.procedureMatcher.match(pathname)

      if (!match) {
        return { matched: false, response: undefined }
      }

      const input = await this.payloadCodec.decode(request)

      const client = createProcedureClient(match.procedure, {
        context,
        path: match.path,
      })

      const output = await client(input, { signal: request.signal })

      const { body, headers } = this.payloadCodec.encode(output)

      const response = new Response(body, { headers })

      return { matched: true, response }
    }

    try {
      const result = await executeWithHooks({
        context,
        execute,
        input: request,
        hooks: this.options,
        meta: {
          signal: request.signal,
        },
      })

      return result
    }
    catch (e) {
      const error = e instanceof ORPCError
        ? e
        : new ORPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          cause: e,
        })

      const { body, headers } = this.payloadCodec.encode(error.toJSON())

      const response = new Response(body, {
        headers,
        status: error.status,
      })

      return { matched: true, response }
    }
  }
}
