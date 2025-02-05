import type { StandardHandlerInterceptorOptions, StandardHandlerOptions, StandardHeaders } from '../adapters/standard'
import type { Context } from '../context'
import type { Plugin } from './base'
import { value, type Value } from '@orpc/shared'

export interface CORSOptions<TContext extends Context> {
  origin: Value<string | string[], [options: StandardHandlerInterceptorOptions<TContext>]>
  allowMethods?: string[]
  allowHeaders?: string[]
  maxAge?: number
  credentials?: boolean
  exposeHeaders?: string[]
}

export class CORSPlugin<TContext extends Context> implements Plugin<TContext> {
  private readonly options: CORSOptions<TContext>

  constructor(options?: Partial<CORSOptions<TContext>>) {
    const defaults: CORSOptions<TContext> = {
      origin: '*',
      allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
      allowHeaders: [],
      exposeHeaders: [],
    }

    this.options = {
      ...defaults,
      ...options,
    }
  }

  init(options: StandardHandlerOptions<TContext>): void {
    options.interceptors ??= []

    options.interceptors.unshift(async (interceptorOptions) => {
      if (interceptorOptions.request.method !== 'OPTIONS') {
        const resHeaders: StandardHeaders = {}

        if (this.options.maxAge !== undefined) {
          resHeaders['access-control-max-age'] = this.options.maxAge.toString()
        }

        if (this.options.allowMethods?.length) {
          resHeaders['access-control-allow-methods'] = this.options.allowMethods.join(',')
        }

        const allowHeaders = this.options.allowHeaders ?? interceptorOptions.request.headers['access-control-request-headers']

        if (allowHeaders !== undefined) {
          resHeaders['access-control-allow-headers'] = allowHeaders
        }

        return {
          matched: true,
          response: {
            status: 204,
            headers: resHeaders,
            body: undefined,
          },
        }
      }

      return interceptorOptions.next()
    })

    options.interceptors.unshift(async (interceptorOptions) => {
      const result = await interceptorOptions.next()

      if (!result.matched) {
        return result
      }

      const origin = interceptorOptions.request.headers.origin || ''
      const allowedOrigin = await value(this.options.origin, interceptorOptions)

      const originArr = Array.isArray(allowedOrigin) ? allowedOrigin : [allowedOrigin]
      const allowedOriginArr = Array.isArray(origin) ? origin : [origin]

      for (const allowedOrigin of allowedOriginArr) {
        if (allowedOrigin === '*' || originArr.includes(allowedOrigin)) {
          result.response.headers['access-control-allow-origin'] = allowedOrigin

          if (allowedOrigin !== '*') {
            result.response.headers.vary = interceptorOptions.request.headers.vary ?? 'origin'
          }
        }
      }

      if (this.options.credentials) {
        result.response.headers['access-control-allow-credentials'] = 'true'
      }

      if (this.options.exposeHeaders?.length) {
        result.response.headers['access-control-expose-headers'] = this.options.exposeHeaders.join(',')
      }

      return result
    })
  }
}
