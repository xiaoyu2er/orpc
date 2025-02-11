import type { AnyProcedure } from '@orpc/server'
import type { StandardBody, StandardHeaders, StandardRequest, StandardResponse } from '@orpc/server-standard'
import type { StandardCodec, StandardParams } from '@orpc/server/standard'
import { fallbackContractConfig, type ORPCError } from '@orpc/contract'
import { isObject } from '@orpc/shared'
import { OpenAPISerializer } from './openapi-serializer'

export interface OpenAPICodecOptions {
  serializer?: OpenAPISerializer
}

export class OpenAPICodec implements StandardCodec {
  private readonly serializer: OpenAPISerializer

  constructor(options?: OpenAPICodecOptions) {
    this.serializer = options?.serializer ?? new OpenAPISerializer()
  }

  async decode(request: StandardRequest, params: StandardParams | undefined, procedure: AnyProcedure): Promise<unknown> {
    const inputStructure = fallbackContractConfig('defaultInputStructure', procedure['~orpc'].route.inputStructure)

    if (inputStructure === 'compact') {
      const data = request.method === 'GET'
        ? this.serializer.deserialize(request.url.searchParams)
        : this.serializer.deserialize(await request.body())

      if (data === undefined) {
        return params
      }

      if (isObject(data)) {
        return {
          ...params,
          ...data,
        }
      }

      return data
    }

    const deserializeSearchParams = () => {
      return this.serializer.deserialize(request.url.searchParams)
    }

    return {
      params,
      get query() {
        const value = deserializeSearchParams()
        Object.defineProperty(this, 'query', { value, writable: true })
        return value
      },
      set query(value) {
        Object.defineProperty(this, 'query', { value, writable: true })
      },
      headers: request.headers,
      body: this.serializer.deserialize(await request.body()),
    }
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

    if (!isObject(output)) {
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
