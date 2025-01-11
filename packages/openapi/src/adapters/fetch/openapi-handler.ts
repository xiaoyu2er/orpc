import type { ANY_PROCEDURE, Context, Router, WithSignal } from '@orpc/server'
import type { FetchHandler, FetchHandleRest, FetchHandleResult } from '@orpc/server/fetch'
import type { Params } from 'hono/router'
import type { PublicInputStructureCompact } from './input-structure-compact'
import { createProcedureClient, fallbackToGlobalConfig, ORPCError } from '@orpc/server'
import { executeWithHooks, type Hooks, isPlainObject, trim } from '@orpc/shared'
import { JSONSerializer, type PublicJSONSerializer } from '../../json-serializer'
import { InputStructureCompact } from './input-structure-compact'
import { InputStructureDetailed, type PublicInputStructureDetailed } from './input-structure-detailed'
import { OpenAPIPayloadCodec, type PublicOpenAPIPayloadCodec } from './openapi-payload-codec'
import { type Hono, OpenAPIProcedureMatcher, type PublicOpenAPIProcedureMatcher } from './openapi-procedure-matcher'
import { CompositeSchemaCoercer, type SchemaCoercer } from './schema-coercer'

export type OpenAPIHandlerOptions<T extends Context> =
  & Hooks<Request, FetchHandleResult, T, WithSignal>
  & {
    jsonSerializer?: PublicJSONSerializer
    procedureMatcher?: PublicOpenAPIProcedureMatcher
    payloadCodec?: PublicOpenAPIPayloadCodec
    inputBuilderSimple?: PublicInputStructureCompact
    inputBuilderFull?: PublicInputStructureDetailed
    schemaCoercers?: SchemaCoercer[]
  }

export class OpenAPIHandler<T extends Context> implements FetchHandler<T> {
  private readonly procedureMatcher: PublicOpenAPIProcedureMatcher
  private readonly payloadCodec: PublicOpenAPIPayloadCodec
  private readonly inputStructureCompact: PublicInputStructureCompact
  private readonly inputStructureDetailed: PublicInputStructureDetailed
  private readonly compositeSchemaCoercer: SchemaCoercer

  constructor(
    hono: Hono,
    router: Router<T, any>,
    private readonly options?: NoInfer<OpenAPIHandlerOptions<T>>,
  ) {
    const jsonSerializer = options?.jsonSerializer ?? new JSONSerializer()

    this.procedureMatcher = options?.procedureMatcher ?? new OpenAPIProcedureMatcher(hono, router)
    this.payloadCodec = options?.payloadCodec ?? new OpenAPIPayloadCodec(jsonSerializer)
    this.inputStructureCompact = options?.inputBuilderSimple ?? new InputStructureCompact()
    this.inputStructureDetailed = options?.inputBuilderFull ?? new InputStructureDetailed()
    this.compositeSchemaCoercer = new CompositeSchemaCoercer(options?.schemaCoercers ?? [])
  }

  async handle(request: Request, ...[options]: FetchHandleRest<T>): Promise<FetchHandleResult> {
    const context = options?.context as T
    const headers = request.headers
    const accept = headers.get('accept') || undefined

    const execute = async (): Promise<FetchHandleResult> => {
      const url = new URL(request.url)
      const pathname = `/${trim(url.pathname.replace(options?.prefix ?? '', ''), '/')}`
      const query = url.searchParams
      const customMethod = request.method === 'POST' ? query.get('method')?.toUpperCase() : undefined
      const matchedMethod = customMethod || request.method

      const matched = await this.procedureMatcher.match(matchedMethod, pathname)

      if (!matched) {
        return { matched: false, response: undefined }
      }

      const contractDef = matched.procedure['~orpc'].contract['~orpc']

      const input = await this.decodeInput(matched.procedure, matched.params, request)

      const coercedInput = this.compositeSchemaCoercer.coerce(contractDef.InputSchema, input)

      const client = createProcedureClient(matched.procedure, {
        context,
        path: matched.path,
      })

      const output = await client(coercedInput, { signal: request.signal })

      const { body, headers: resHeaders } = this.encodeOutput(matched.procedure, output, accept)

      const response = new Response(body, {
        headers: resHeaders,
        status: fallbackToGlobalConfig('defaultSuccessStatus', contractDef.route?.successStatus),
      })

      return { matched: true, response }
    }

    try {
      return await executeWithHooks({
        context,
        execute,
        input: request,
        hooks: this.options,
        meta: {
          signal: request.signal,
        },
      })
    }
    catch (e) {
      const error = this.convertToORPCError(e)

      try {
        const { body, headers } = this.payloadCodec.encode(error.toJSON(), accept)

        const response = new Response(body, {
          status: error.status,
          headers,
        })

        return { matched: true, response }
      }
      catch (e) {
        /**
         * This catch usually happens when the `Accept` header is not supported.
         */
        const error = this.convertToORPCError(e)

        const { body, headers } = this.payloadCodec.encode(error.toJSON(), undefined)

        const response = new Response(body, {
          status: error.status,
          headers,
        })

        return { matched: true, response }
      }
    }
  }

  private async decodeInput(procedure: ANY_PROCEDURE, params: Params, request: Request): Promise<unknown> {
    const inputStructure = fallbackToGlobalConfig('defaultInputStructure', procedure['~orpc'].contract['~orpc'].route?.inputStructure)

    const url = new URL(request.url)
    const query = url.searchParams
    const headers = request.headers

    if (inputStructure === 'compact') {
      return this.inputStructureCompact.build(
        params,
        request.method === 'GET'
          ? await this.payloadCodec.decode(query)
          : await this.payloadCodec.decode(request),
      )
    }

    const decodedQuery = await this.payloadCodec.decode(query)
    const decodedHeaders = await this.payloadCodec.decode(headers)
    const decodedBody = await this.payloadCodec.decode(request)

    return this.inputStructureDetailed.build(params, decodedQuery, decodedHeaders, decodedBody)
  }

  private encodeOutput(
    procedure: ANY_PROCEDURE,
    output: unknown,
    accept: string | undefined,
  ): { body: string | Blob | FormData | undefined, headers?: Headers } {
    const outputStructure = fallbackToGlobalConfig('defaultOutputStructure', procedure['~orpc'].contract['~orpc'].route?.outputStructure)

    if (outputStructure === 'compact') {
      return this.payloadCodec.encode(output, accept)
    }

    this.assertDetailedOutput(output)

    const headers = new Headers()

    if (output.headers) {
      for (const [key, value] of Object.entries(output.headers)) {
        headers.append(key, value)
      }
    }

    const { body, headers: encodedHeaders } = this.payloadCodec.encode(output.body, accept)

    if (encodedHeaders) {
      for (const [key, value] of encodedHeaders.entries()) {
        headers.append(key, value)
      }
    }

    return { body, headers }
  }

  private assertDetailedOutput(output: unknown): asserts output is { body: unknown, headers?: Record<string, string> } {
    const error = new Error(`
      Invalid output structure for 'detailed' output. 
      Expected format:
      {
        body?: unknown;       // The main response content (optional)
        headers?: {           // Additional headers (optional)
          [key: string]: string;
        };
      }

      Example:
      {
        body: { message: "Success" },
        headers: { "X-Custom-Header": "Custom-Value" },
      }

      Fix: Ensure your output matches the expected structure.
    `)

    if (!isPlainObject(output) || Object.keys(output).some(key => key !== 'body' && key !== 'headers')) {
      throw error
    }

    if (output.headers !== undefined && !isPlainObject(output.headers)) {
      throw error
    }

    if (output.headers && Object.entries(output.headers).some(([key, value]) => typeof key !== 'string' || typeof value !== 'string')) {
      throw error
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
