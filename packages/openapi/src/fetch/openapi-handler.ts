import type { ConditionalFetchHandler, FetchOptions } from '@orpc/server/fetch'
import type { PublicInputBuilderSimple } from './input-builder-simple'
import { type Context, createProcedureClient, ORPCError, type Router, type WithSignal } from '@orpc/server'
import { executeWithHooks, type Hooks, ORPC_HANDLER_HEADER, trim } from '@orpc/shared'
import { InputBuilderFull, type PublicInputBuilderFull } from './input-builder-full'
import { InputBuilderSimple } from './input-builder-simple'
import { OpenAPIPayloadCodec, type PublicOpenAPIPayloadCodec } from './openapi-payload-codec'
import { type Hono, OpenAPIProcedureMatcher, type PublicOpenAPIProcedureMatcher } from './openapi-procedure-matcher'

export type OpenAPIHandlerOptions<T extends Context> =
  & Hooks<Request, Response, T, WithSignal>
  & {
    procedureMatcher?: PublicOpenAPIProcedureMatcher
    payloadCodec?: PublicOpenAPIPayloadCodec
    inputBuilderSimple?: PublicInputBuilderSimple
    inputBuilderFull?: PublicInputBuilderFull
  }

export class OpenAPIHandler<T extends Context> implements ConditionalFetchHandler<T> {
  private readonly procedureMatcher: PublicOpenAPIProcedureMatcher
  private readonly payloadCodec: PublicOpenAPIPayloadCodec
  private readonly inputBuilderSimple: PublicInputBuilderSimple
  private readonly inputBuilderFull: PublicInputBuilderFull

  constructor(
    hono: Hono,
    router: Router<T, any>,
    private readonly options?: NoInfer<OpenAPIHandlerOptions<T>>,
  ) {
    this.procedureMatcher = options?.procedureMatcher ?? new OpenAPIProcedureMatcher(hono, router)
    this.payloadCodec = options?.payloadCodec ?? new OpenAPIPayloadCodec()
    this.inputBuilderSimple = options?.inputBuilderSimple ?? new InputBuilderSimple()
    this.inputBuilderFull = options?.inputBuilderFull ?? new InputBuilderFull()
  }

  condition(request: Request): boolean {
    return request.headers.get(ORPC_HANDLER_HEADER) === null
  }

  async fetch(
    request: Request,
    ...[options]: [options: FetchOptions<T>] | (undefined extends T ? [] : never)
  ): Promise<Response> {
    const context = options?.context as T
    const headers = request.headers
    const accept = headers.get('Accept') || undefined

    const execute = async () => {
      const url = new URL(request.url)
      const pathname = `/${trim(url.pathname.replace(options?.prefix ?? '', ''), '/')}`
      const query = url.searchParams
      const customMethod = request.method === 'POST' ? query.get('method')?.toUpperCase() : undefined
      const method = customMethod || request.method

      const match = await this.procedureMatcher.match(method, pathname)

      if (!match) {
        throw new ORPCError({ code: 'NOT_FOUND', message: 'Not found' })
      }

      // TODO: handle input-builder-full
      // const decodedHeaders = await this.payloadCodec.decode(headers)
      // const decodedQuery = await this.payloadCodec.decode(query)
      const decodedPayload = request.method === 'POST'
        ? await this.payloadCodec.decode(request)
        : await this.payloadCodec.decode(query)

      const input = this.inputBuilderSimple.build(match.params, decodedPayload)

      const client = createProcedureClient({
        context,
        procedure: match.procedure,
        path: match.path,
      })

      const output = await client(input, { signal: options?.signal })

      const { body, headers } = this.payloadCodec.encode(output)

      return new Response(body, { headers })
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
      const error = this.convertToORPCError(e)

      try {
        const { body, headers } = this.payloadCodec.encode(error.toJSON(), accept)
        return new Response(body, {
          status: error.status,
          headers,
        })
      }
      catch (e) {
        /**
         * This catch usually happens when the `Accept` header is not supported.
         */

        const error = this.convertToORPCError(e)

        const { body, headers } = this.payloadCodec.encode(error.toJSON())
        return new Response(body, {
          status: error.status,
          headers,
        })
      }
    }
  }

  private convertToORPCError(e: unknown): ORPCError<any, any> {
    return e instanceof ORPCError
      ? e
      : new ORPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        cause: e,
      })
  }
}
