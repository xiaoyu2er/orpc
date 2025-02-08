import type { AnyProcedure } from '@orpc/server'
import type { StandardBody, StandardCodec, StandardHeaders, StandardParams, StandardRequest, StandardResponse } from '@orpc/server/standard'
import { fallbackContractConfig, type ORPCError } from '@orpc/contract'
import { isPlainObject } from '@orpc/shared'

export class OpenAPICodec implements StandardCodec {
  async decode(request: StandardRequest, params: StandardParams | undefined, procedure: AnyProcedure): Promise<unknown> {
    const inputStructure = fallbackContractConfig('defaultInputStructure', procedure['~orpc'].route.inputStructure)

    if (inputStructure === 'compact') {
      const data = request.method === 'GET'
        ? request.query
        : await request.body()

      if (data === undefined) {
        return params
      }

      if (isPlainObject(data)) {
        return {
          ...params,
          ...data,
        }
      }

      return data
    }

    return {
      params,
      query: request.query,
      headers: request.headers,
      body: await request.body(),
    }
  }

  encode(output: unknown, procedure: AnyProcedure): StandardResponse {
    const successStatus = fallbackContractConfig('defaultSuccessStatus', procedure['~orpc'].route.successStatus)
    const outputStructure = fallbackContractConfig('defaultOutputStructure', procedure['~orpc'].route.outputStructure)

    if (outputStructure === 'compact') {
      return {
        status: successStatus,
        headers: {},
        body: output as StandardBody,
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
      body: output.body as StandardBody,
    }
  }

  encodeError(error: ORPCError<any, any>): StandardResponse {
    return {
      status: error.status,
      headers: {},
      body: error.toJSON() as StandardBody,
    }
  }
}
