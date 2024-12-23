import type { Context, Router, WithSignal } from '@orpc/server'
import type { FetchHandler, FetchOptions } from '@orpc/server/fetch'
import type { Hooks } from '@orpc/shared'
import type { Hono } from './procedure-matcher'
import type { OpenApiInputBuilder, OpenAPITransformer } from './types'
import { createProcedureClient, ORPCError } from '@orpc/server'
import { executeWithHooks, trim, value } from '@orpc/shared'
import { OpenAPIBodyParser } from './body-parser'
import { OpenAPISimpleInputBuilder } from './input-builder-simple'
import { OpenAPIProcedureMatcher } from './procedure-matcher'
import { OpenAPIResponseBuilder } from './response-builder'
import { OpenAPICompositeTransformer } from './transformer-composite'

export type OpenAPIHandlerOptions<T extends Context> = Hooks<Request, Response, T, WithSignal> & {
  defaultInputBuilder?: OpenApiInputBuilder
  bodyParser?: OpenAPIBodyParser
  responseBuilder?: OpenAPIResponseBuilder
  transformers?: OpenAPITransformer[]
}

export class OpenAPIHandler<T extends Context> implements FetchHandler<T> {
  private matcher: OpenAPIProcedureMatcher
  private defaultInputBuilder: OpenApiInputBuilder
  private bodyParser: OpenAPIBodyParser
  private responseBuilder: OpenAPIResponseBuilder
  private compositeTransformer: OpenAPICompositeTransformer

  constructor(
    readonly hono: Hono,
    readonly router: Router<T, any>,
    private readonly options?: NoInfer<OpenAPIHandlerOptions<T>>,
  ) {
    this.matcher = new OpenAPIProcedureMatcher(hono, router)

    this.defaultInputBuilder = options?.defaultInputBuilder ?? new OpenAPISimpleInputBuilder()
    this.bodyParser = options?.bodyParser ?? new OpenAPIBodyParser()
    this.responseBuilder = options?.responseBuilder ?? new OpenAPIResponseBuilder()
    this.compositeTransformer = new OpenAPICompositeTransformer(options?.transformers ?? [])
  }

  async fetch(request: Request, options: FetchOptions<T>): Promise<Response> {
    try {
      const context = await value(options.context) as T

      return await executeWithHooks({
        hooks: this.options,
        meta: options,
        context: context as T,
        execute: () => this.handleFetchRequest(request, { ...(options as any), context }),
        input: request,
      })
    }
    catch (e) {
      try {
        const error = this.toORPCError(e)
        const errorJson = error.toJSON()
        const serializedErrorJson = await this.compositeTransformer.serialize(errorJson)
        const response = this.responseBuilder.build(serializedErrorJson)

        return response
      }
      catch (e) {
        const error = this.toORPCError(e)
        const response = this.responseBuilder.build(error.toJSON())
        return response
      }
    }
  }

  private async handleFetchRequest(request: Request, options: FetchOptions<T> & { context: T }): Promise<Response> {
    const headers = request.headers
    const url = new URL(request.url)
    const query = url.searchParams
    const pathname = `/${trim(url.pathname.replace(options.prefix ?? '', ''), '/')}`
    const customMethod = request.method === 'POST' ? query.get('method')?.toUpperCase() : undefined
    const method = customMethod || request.method

    const match = await this.matcher.match(method, pathname)

    if (!match) {
      throw new ORPCError({ code: 'NOT_FOUND', message: 'Not found' })
    }

    const { path, procedure, params } = match

    const client = createProcedureClient({
      procedure,
      context: options.context,
      path,
    })

    const body = await this.bodyParser.parse(request)

    // TODO: use procedure level input builder
    const input = this.defaultInputBuilder.build(params, query, headers, body)

    const deserializedInput = await this.compositeTransformer.deserialize(input)

    const output = await client(deserializedInput, { signal: options.signal })

    const serializedOutput = await this.compositeTransformer.serialize(output)

    const response = this.responseBuilder.build(serializedOutput)

    return response
  }

  private toORPCError(e: unknown): ORPCError<any, any> {
    return e instanceof ORPCError
      ? e
      : new ORPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        cause: e,
      })
  }
}
