import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientContext, ClientOptionsOut } from '../../types'
import type { StandardLinkClient } from '../standard'
import { toFetchRequest, toStandardLazyResponse } from '@orpc/standard-server-fetch'

export interface LinkFetchClientOptions<T extends ClientContext> {
  fetch?: (request: Request, init: undefined, options: ClientOptionsOut<T>, path: readonly string[], input: unknown) => Promise<Response>
}

export class LinkFetchClient<T extends ClientContext> implements StandardLinkClient<T> {
  private readonly fetch: Exclude<LinkFetchClientOptions<T>['fetch'], undefined>

  constructor(options: LinkFetchClientOptions<T>) {
    this.fetch = options?.fetch ?? globalThis.fetch.bind(globalThis)
  }

  async call(request: StandardRequest, options: ClientOptionsOut<T>, path: readonly string[], input: unknown): Promise<StandardLazyResponse> {
    const fetchRequest = toFetchRequest(request)

    const fetchResponse = await this.fetch(fetchRequest, undefined, options, path, input)

    const lazyResponse = toStandardLazyResponse(fetchResponse)

    return lazyResponse
  }
}
