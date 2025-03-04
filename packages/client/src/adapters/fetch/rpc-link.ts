import type { ClientContext, ClientLink, ClientOptionsOut } from '../../types'
import type { StandardLinkOptions, StandardRPCLinkCodecOptions } from '../standard'
import type { LinkFetchClientOptions } from './link-fetch-client'
import { StandardLink, StandardRPCLinkCodec } from '../standard'
import { LinkFetchClient } from './link-fetch-client'

export interface RPCLinkOptions<T extends ClientContext>
  extends StandardLinkOptions<T>, StandardRPCLinkCodecOptions<T>, LinkFetchClientOptions<T> {
  linkCodec?: StandardRPCLinkCodec<T>
  linkClient?: LinkFetchClient<T>
}

export class RPCLink<T extends ClientContext> implements ClientLink<T> {
  private readonly standardLink: StandardLink<T>

  constructor(options: RPCLinkOptions<T>) {
    const linkCodec = options.linkCodec ?? new StandardRPCLinkCodec(options)
    const linkClient = options.linkClient ?? new LinkFetchClient(options)
    this.standardLink = new StandardLink(linkCodec, linkClient, options)
  }

  async call(path: readonly string[], input: unknown, options: ClientOptionsOut<T>): Promise<unknown> {
    return this.standardLink.call(path, input, options)
  }
}
