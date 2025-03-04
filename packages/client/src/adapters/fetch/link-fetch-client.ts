import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ToFetchRequestOptions } from '@orpc/standard-server-fetch'
import type { ClientContext, ClientOptionsOut } from '../../types'
import type { StandardLinkClient } from '../standard'
import { toFetchRequest, toStandardLazyResponse } from '@orpc/standard-server-fetch'

export interface LinkFetchClientOptions<T extends ClientContext> extends ToFetchRequestOptions {
  fetch?: (
    request: Request,
    init: Record<never, never>,
    options: ClientOptionsOut<T>,
    path: readonly string[],
    input: unknown
  ) => Promise<Response>
}

export class LinkFetchClient<T extends ClientContext> implements StandardLinkClient<T> {
  private readonly fetch: Exclude<LinkFetchClientOptions<T>['fetch'], undefined>
  private readonly toFetchRequestOptions: ToFetchRequestOptions

  constructor(options: LinkFetchClientOptions<T>) {
    this.fetch = options?.fetch ?? globalThis.fetch.bind(globalThis)
    this.toFetchRequestOptions = options
  }

  async call(request: StandardRequest, options: ClientOptionsOut<T>, path: readonly string[], input: unknown): Promise<StandardLazyResponse> {
    const fetchRequest = toFetchRequest(request, this.toFetchRequestOptions)

    const fetchResponse = await this.fetch(fetchRequest, {}, options, path, input)

    const lazyResponse = toStandardLazyResponse(fetchResponse)

    return lazyResponse
  }
}
