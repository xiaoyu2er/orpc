import type { ClientContext } from '@orpc/client'
import type { AnyContractRouter } from '@orpc/contract'
import { LinkFetchClient, type LinkFetchClientOptions } from '@orpc/client/fetch'
import { StandardOpenAPILink, type StandardOpenAPILinkOptions } from '../standard'

export interface OpenAPILinkOptions<T extends ClientContext>
  extends StandardOpenAPILinkOptions<T>, LinkFetchClientOptions<T> { }

export class OpenAPILink<T extends ClientContext> extends StandardOpenAPILink<T> {
  constructor(contract: AnyContractRouter, options: OpenAPILinkOptions<T>) {
    const linkClient = new LinkFetchClient(options)

    super(contract, linkClient, options)
  }
}
