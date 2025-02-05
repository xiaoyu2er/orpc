import type { AnyProcedure } from '@orpc/server'
import type { StandardBody, StandardCodec, StandardHeaders, StandardParams, StandardRequest, StandardResponse } from '@orpc/server/standard'
import { fallbackContractConfig, type ORPCError } from '@orpc/contract'
import { isPlainObject, once } from '@orpc/shared'
import { OpenAPISerializer } from './openapi-serializer'
import { CompositeSchemaCoercer, type SchemaCoercer } from './schema-coercer'

export interface OpenAPICodecOptions {
  serializer?: OpenAPISerializer
  schemaCoercers?: SchemaCoercer[]
}

export class OpenAPICodec implements StandardCodec {
  private readonly serializer: OpenAPISerializer
  private readonly compositeSchemaCoercer: SchemaCoercer

  constructor(options?: OpenAPICodecOptions) {
    this.serializer = options?.serializer ?? new OpenAPISerializer()

    this.compositeSchemaCoercer = new CompositeSchemaCoercer(options?.schemaCoercers ?? [])
  }

  async decode(request: StandardRequest, params: StandardParams | undefined, procedure: AnyProcedure): Promise<unknown> {
    const inputStructure = fallbackContractConfig('defaultInputStructure', procedure['~orpc'].route.inputStructure)

    if (inputStructure === 'compact') {
      const data = request.method === 'GET'
        ? this.serializer.deserialize(request.url.searchParams)
        : this.serializer.deserialize(await request.body())

      if (data === undefined) {
        return this.compositeSchemaCoercer.coerce(procedure['~orpc'].inputSchema, params)
      }

      if (isPlainObject(data)) {
        return this.compositeSchemaCoercer.coerce(procedure['~orpc'].inputSchema, {
          ...params,
          ...data,
        })
      }

      return this.compositeSchemaCoercer.coerce(procedure['~orpc'].inputSchema, data)
    }

    const query = once(() => {
      return this.serializer.deserialize(request.url.searchParams)
    })

    return this.compositeSchemaCoercer.coerce(procedure['~orpc'].inputSchema, {
      params,
      get query() {
        return query()
      },
      headers: request.headers,
      body: this.serializer.deserialize(await request.body()),
    })
  }

  encode(output: unknown, procedure: AnyProcedure): StandardResponse {
    const successStatus = fallbackContractConfig('defaultSuccessStatus', procedure['~orpc'].route.successStatus)
    const outputStructure = fallbackContractConfig('defaultOutputStructure', procedure['~orpc'].route.outputStructure)

    if (outputStructure === 'compact') {
      return {
        status: successStatus,
        headers: {},
        body: this.serializer.serialize(output) as StandardBody,
      }
    }

    if (!isPlainObject(output)) {
      throw new Error(
        'Invalid output structure for "detailed" output. Expected format: { body: any, headers?: Record<string, string | string[] | undefined> }',
      )
    }

    return {
      status: successStatus,
      headers: output.headers as StandardHeaders ?? {},
      body: this.serializer.serialize(output.body) as StandardBody,
    }
  }

  encodeError(error: ORPCError<any, any>): StandardResponse {
    return {
      status: error.status,
      headers: {},
      body: this.serializer.serialize(error.toJSON()) as StandardBody,
    }
  }
}
