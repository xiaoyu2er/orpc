import type { StandardLinkClientInterceptorOptions, StandardLinkOptions, StandardLinkPlugin } from '../adapters/standard'
import type { ClientContext } from '../types'
import { value, type Value } from '@orpc/shared'

export interface SimpleCsrfProtectionLinkPluginOptions<T extends ClientContext> {
  /**
   * The name of the header to check.
   *
   * @default 'x-csrf-token'
   */
  headerName?: Value<string, [options: StandardLinkClientInterceptorOptions<T>]>

  /**
   * The value of the header to check.
   *
   * @default 'orpc'
   *
   */
  headerValue?: Value<string, [options: StandardLinkClientInterceptorOptions<T>]>
}

export class SimpleCsrfProtectionLinkPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  private readonly headerName: Exclude<SimpleCsrfProtectionLinkPluginOptions<T>['headerName'], undefined>
  private readonly headerValue: Exclude<SimpleCsrfProtectionLinkPluginOptions<T>['headerValue'], undefined>

  constructor(options: SimpleCsrfProtectionLinkPluginOptions<T> = {}) {
    this.headerName = options.headerName ?? 'x-csrf-token'
    this.headerValue = options.headerValue ?? 'orpc'
  }

  order = 8_000_000

  init(options: StandardLinkOptions<T>): void {
    options.clientInterceptors ??= []

    options.clientInterceptors.push(async (options) => {
      const headerName = await value(this.headerName, options)
      const headerValue = await value(this.headerValue, options)

      return options.next({
        ...options,
        request: {
          ...options.request,
          headers: {
            ...options.request.headers,
            [headerName]: headerValue,
          },
        },
      })
    })
  }
}
