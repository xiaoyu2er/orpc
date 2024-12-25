import type { FetchHandler, FetchOptions } from '@orpc/server/fetch'
import type { Hono } from './openapi-matcher'
import { type Context, createProcedureClient, ORPCError, type Router, type WithSignal } from '@orpc/server'
import { type Hooks, trim } from '@orpc/shared'
import { OpenAPIBodyCodec } from './openapi-body-codec'
import { OpenAPIInputFullBuilder } from './openapi-input-full-builder'
import { OpenAPIInputSimpleBuilder } from './openapi-input-simple-builder'
import { OpenAPIMatcher } from './openapi-matcher'

export type ORPCHandlerOptions<T extends Context> =
  & Hooks<Request, Response, T, WithSignal>
  & {
    matcher?: OpenAPIMatcher
    codec?: OpenAPIBodyCodec
    inputSimpleBuilder: OpenAPIInputSimpleBuilder
    inputFullBuilder: OpenAPIInputFullBuilder
  }

export class OpenAPIHandler<T extends Context> implements FetchHandler<T> {
  private readonly matcher: OpenAPIMatcher
  private readonly codec: OpenAPIBodyCodec
  private readonly inputSimpleBuilder: OpenAPIInputSimpleBuilder
  private readonly inputFullBuilder: OpenAPIInputFullBuilder

  constructor(
    readonly hono: Hono,
    readonly router: Router<T, any>,
    readonly options?: NoInfer<ORPCHandlerOptions<T>>,
  ) {
    this.matcher = options?.matcher ?? new OpenAPIMatcher(hono, router)
    this.codec = options?.codec ?? new OpenAPIBodyCodec()
    this.inputSimpleBuilder = options?.inputSimpleBuilder ?? new OpenAPIInputSimpleBuilder()
    this.inputFullBuilder = options?.inputFullBuilder ?? new OpenAPIInputFullBuilder()
  }

  fetch(
    request: Request,
    ...[options]: [options: FetchOptions<T>] | (undefined extends T ? [] : never)
  ): Promise<Response> {
    const context = options?.context as T

    const execute = async () => {
      const url = new URL(request.url)
      const query = url.searchParams
      const customMethod = request.method === 'POST' ? query.get('method')?.toUpperCase() : undefined
      const method = customMethod || request.method
      const pathname = `/${trim(url.pathname.replace(options?.prefix ?? '', ''), '/')}`

      const match = await this.matcher.match(method, pathname)

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
