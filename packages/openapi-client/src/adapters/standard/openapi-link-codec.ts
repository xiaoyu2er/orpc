import type { ClientContext, ClientOptions, HTTPPath } from '@orpc/client'
import type { StandardLinkCodec } from '@orpc/client/standard'
import type { AnyContractProcedure, ContractRouter } from '@orpc/contract'
import type { StandardOpenAPISerializer } from './openapi-serializer'
import { toHttpPath } from '@orpc/client/standard'
import { fallbackContractConfig, isContractProcedure, ORPCError } from '@orpc/contract'
import { get, isObject, value, type Value } from '@orpc/shared'
import { mergeStandardHeaders, type StandardHeaders, type StandardLazyResponse, type StandardRequest } from '@orpc/standard-server'
import { getDynamicParams } from './utils'

export interface StandardOpenapiLinkCodecOptions<T extends ClientContext> {
  /**
   * Base url for all requests.
   */
  url: Value<string | URL, [
        options: ClientOptions<T>,
        path: readonly string[],
        input: unknown,
  ]>

  /**
   * Inject headers to the request.
   */
  headers?: Value<StandardHeaders, [
        options: ClientOptions<T>,
        path: readonly string[],
        input: unknown,
  ]>
}

export class StandardOpenapiLinkCodec<T extends ClientContext> implements StandardLinkCodec<T> {
  private readonly baseUrl: Exclude<StandardOpenapiLinkCodecOptions<T>['url'], undefined>
  private readonly headers: Exclude<StandardOpenapiLinkCodecOptions<T>['headers'], undefined>

  constructor(
    private readonly contract: ContractRouter<any>,
    private readonly serializer: StandardOpenAPISerializer,
    options: StandardOpenapiLinkCodecOptions<T>,
  ) {
    this.baseUrl = options.url
    this.headers = options.headers ?? {}
  }

  async encode(path: readonly string[], input: unknown, options: ClientOptions<T>): Promise<StandardRequest> {
    const baseUrl = await value(this.baseUrl, options, path, input)
    let headers = await value(this.headers, options, path, input)

    if (options.lastEventId !== undefined) {
      headers = mergeStandardHeaders(headers, { 'last-event-id': options.lastEventId })
    }

    const procedure = get(this.contract, path)

    if (!isContractProcedure(procedure)) {
      throw new Error(`Not found contract procedure corresponding to the path: ${path.join('.')}`)
    }

    const inputStructure = fallbackContractConfig('defaultInputStructure', procedure['~orpc'].route.inputStructure)

    return inputStructure === 'compact'
      ? this.#encodeCompact(procedure, path, input, options, baseUrl.toString(), headers)
      : this.#encodeDetailed(procedure, path, input, options, baseUrl.toString(), headers)
  }

  #encodeCompact(
    procedure: AnyContractProcedure,
    path: readonly string[],
    input: unknown,
    options: ClientOptions<T>,
    baseUrl: string,
    headers: StandardHeaders,
  ): StandardRequest {
    let httpPath = procedure['~orpc'].route.path ?? toHttpPath(path)
    let httpBody = input

    const dynamicParams = getDynamicParams(httpPath)

    if (dynamicParams?.length) {
      if (!isObject(input)) {
        throw new TypeError(`
           [StandardOpenapiLinkCodec] Unable to encode payload contains dynamic params but input is not an object at path "${path.join('.')}".
        `)
      }

      const body = { ...input }

      for (const param of dynamicParams) {
        const value = input[param.name]

        if (typeof value !== 'string') {
          throw new TypeError(`
            [StandardOpenapiLinkCodec] Unable to encode dynamic path parameter "${param.name}" with value "${value}" at path "${path.join('.')}".
          `)
        }

        httpPath = httpPath.replace(param.raw, `/${value}`) as HTTPPath
        delete body[param.name]
      }

      httpBody = Object.keys(body).length ? body : undefined
    }

    const method = fallbackContractConfig('defaultMethod', procedure['~orpc'].route.method)
    const url = new URL(`${baseUrl.toString().replace(/\/$/, '')}${httpPath}`)

    if (method === 'GET') {
      const serialized = this.serializer.serialize(httpBody, { outputFormat: 'URLSearchParams' }) as URLSearchParams

      for (const [key, value] of serialized) {
        url.searchParams.append(key, value)
      }

      return {
        url,
        method,
        headers,
        body: undefined,
        signal: options.signal,
      }
    }

    return {
      url,
      method,
      headers,
      body: this.serializer.serialize(httpBody),
      signal: options.signal,
    }
  }

  #encodeDetailed(
    procedure: AnyContractProcedure,
    path: readonly string[],
    input: unknown,
    options: ClientOptions<T>,
    baseUrl: string,
    headers: StandardHeaders,
  ): StandardRequest {
    if (!isObject(input)) {
      throw new TypeError(`
        [StandardOpenapiLinkCodec] Unable to encode payload is not an object when input structure is "detailed" at path "${path.join('.')}".
      `)
    }

    let httpPath = procedure['~orpc'].route.path ?? toHttpPath(path)
    const dynamicParams = getDynamicParams(httpPath)

    if (dynamicParams?.length) {
      if (!isObject(input.params)) {
        throw new TypeError(`
            [StandardOpenapiLinkCodec] params must be object when has dynamic params in "detailed" input structure at path "${path.join('.')}".
        `)
      }

      for (const param of dynamicParams) {
        const value = input.params[param.name]

        if (typeof value !== 'string') {
          throw new TypeError(`
            [StandardOpenapiLinkCodec] Unable to encode dynamic path parameter "${param.name}" with value "${value}" at path "${path.join('.')}".
          `)
        }

        httpPath = httpPath.replace(param.raw, `/${value}`) as HTTPPath
      }
    }

    let mergedHeaders = headers

    if (input.headers !== undefined) {
      if (!isObject(input.headers)) {
        throw new TypeError(`
          [StandardOpenapiLinkCodec] When input structure is "detailed", the input must contains "headers" field which is an object.
        `)
      }

      mergedHeaders = mergeStandardHeaders(input.headers as StandardHeaders, headers)
    }

    const method = fallbackContractConfig('defaultMethod', procedure['~orpc'].route.method)
    const url = new URL(`${baseUrl.toString().replace(/\/$/, '')}${httpPath}`)

    if (input.query !== undefined) {
      if (!isObject(input.query)) {
        throw new TypeError(`
            [StandardOpenapiLinkCodec] When input structure is "detailed", the input must contains "query" field which is an object.
        `)
      }

      const query = this.serializer.serialize(input.query, { outputFormat: 'URLSearchParams' }) as URLSearchParams

      for (const [key, value] of query) {
        url.searchParams.append(key, value)
      }
    }

    if (method === 'GET') {
      return {
        url,
        method,
        headers: mergedHeaders,
        body: undefined,
        signal: options.signal,
      }
    }

    return {
      url,
      method,
      headers: mergedHeaders,
      body: this.serializer.serialize(input.body),
      signal: options.signal,
    }
  }

  async decode(response: StandardLazyResponse, _options: ClientOptions<T>, path: readonly string[]): Promise<unknown> {
    const isOk = response.status >= 200 && response.status < 300

    const body = await (async () => {
      try {
        return await response.body()
      }
      catch (error) {
        throw new Error('Failed to parse response body, please check the response body and content-type.', {
          cause: error,
        })
      }
    })()

    if (!isOk) {
      if (ORPCError.isValidJSON(body)) {
        throw ORPCError.fromJSON(body)
      }

      throw new Error('Invalid OpenAPI Error response format.', {
        cause: body,
      })
    }

    const procedure = get(this.contract, path)

    if (!isContractProcedure(procedure)) {
      throw new Error(`Not found contract procedure corresponding to the path: ${path.join('.')}`)
    }

    const outputStructure = fallbackContractConfig('defaultOutputStructure', procedure['~orpc'].route.outputStructure)

    if (outputStructure === 'compact') {
      return body
    }

    return {
      headers: response.headers,
      body,
    }
  }
}
