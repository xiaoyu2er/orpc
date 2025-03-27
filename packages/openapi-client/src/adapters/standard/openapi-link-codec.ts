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
      throw new Error(`[StandardOpenapiLinkCodec] expect a contract procedure at ${path.join('.')}`)
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
        throw new TypeError(`[StandardOpenapiLinkCodec] Invalid input shape for "compact" structure when has dynamic params at ${path.join('.')}.`)
      }

      const body = { ...input }

      for (const param of dynamicParams) {
        const value = input[param.name]
        httpPath = httpPath.replace(param.raw, `/${encodeURIComponent(`${this.serializer.serialize(value)}`)}`) as HTTPPath
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
    let httpPath = procedure['~orpc'].route.path ?? toHttpPath(path)
    const dynamicParams = getDynamicParams(httpPath)

    if (!isObject(input) && input !== undefined) {
      throw new TypeError(`[StandardOpenapiLinkCodec] Invalid input shape for "detailed" structure at ${path.join('.')}.`)
    }

    if (dynamicParams?.length) {
      if (!isObject(input?.params)) {
        throw new TypeError(`[StandardOpenapiLinkCodec] Invalid input.params shape for "detailed" structure when has dynamic params at ${path.join('.')}.`)
      }

      for (const param of dynamicParams) {
        const value = input.params[param.name]
        httpPath = httpPath.replace(param.raw, `/${encodeURIComponent(`${this.serializer.serialize(value)}`)}`) as HTTPPath
      }
    }

    let mergedHeaders = headers

    if (input?.headers !== undefined) {
      if (!isObject(input.headers)) {
        throw new TypeError(`[StandardOpenapiLinkCodec] Invalid input.headers shape for "detailed" structure at ${path.join('.')}.`)
      }

      mergedHeaders = mergeStandardHeaders(input.headers as StandardHeaders, headers)
    }

    const method = fallbackContractConfig('defaultMethod', procedure['~orpc'].route.method)
    const url = new URL(`${baseUrl.toString().replace(/\/$/, '')}${httpPath}`)

    if (input?.query !== undefined) {
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
      body: this.serializer.serialize(input?.body),
      signal: options.signal,
    }
  }

  async decode(response: StandardLazyResponse, _options: ClientOptions<T>, path: readonly string[]): Promise<unknown> {
    const isOk = response.status >= 200 && response.status < 300

    const deserialized = await (async () => {
      let isBodyOk = false

      try {
        const body = await response.body()

        isBodyOk = true

        return this.serializer.deserialize(body)
      }
      catch (error) {
        if (!isBodyOk) {
          throw new Error('Cannot parse response body, please check the response body and content-type.', {
            cause: error,
          })
        }

        throw new Error('Invalid OpenAPI response format.', {
          cause: error,
        })
      }
    })()

    if (!isOk) {
      if (ORPCError.isValidJSON(deserialized)) {
        throw ORPCError.fromJSON(deserialized)
      }

      throw new ORPCError('MALFORMED_ORPC_ERROR_RESPONSE', {
        status: response.status,
        data: deserialized,
      })
    }

    const procedure = get(this.contract, path)

    if (!isContractProcedure(procedure)) {
      throw new Error(`[StandardOpenapiLinkCodec] expect a contract procedure at ${path.join('.')}`)
    }

    const outputStructure = fallbackContractConfig('defaultOutputStructure', procedure['~orpc'].route.outputStructure)

    if (outputStructure === 'compact') {
      return deserialized
    }

    return {
      headers: response.headers,
      body: deserialized,
    }
  }
}
