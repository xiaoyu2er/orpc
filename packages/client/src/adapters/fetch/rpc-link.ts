import type { ClientContext, ClientLink, ClientOptionsOut } from '../../types'
import type { StandardLinkOptions, StandardRPCLinkCodecOptions } from '../standard'
import type { LinkFetchClientOptions } from './link-fetch-client'
import { RPCSerializer, StandardLink, StandardRPCLinkCodec } from '../standard'
import { LinkFetchClient } from './link-fetch-client'

export interface RPCLinkOptions<T extends ClientContext>
  extends StandardLinkOptions<T>, StandardRPCLinkCodecOptions<T>, LinkFetchClientOptions<T> {}

export class RPCLink<T extends ClientContext> implements ClientLink<T> {
  private readonly standardLink: StandardLink<T>

  constructor(options: RPCLinkOptions<T>) {
    const serializer = new RPCSerializer()
    const linkCodec = new StandardRPCLinkCodec(serializer, options)
    const linkClient = new LinkFetchClient(options)

    this.standardLink = new StandardLink(linkCodec, linkClient, options)
  }

  async call(path: readonly string[], input: unknown, options: ClientOptionsOut<T>): Promise<unknown> {
    return this.standardLink.call(path, input, options)
  }
}
