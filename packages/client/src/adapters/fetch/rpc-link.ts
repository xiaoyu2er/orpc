import type { ClientContext, ClientLink, ClientOptions } from '../../types'
import type { StandardRPCLinkOptions } from '../standard'
import type { LinkFetchClientOptions } from './link-fetch-client'
import { StandardLink, StandardRPCJsonSerializer, StandardRPCLinkCodec, StandardRPCSerializer } from '../standard'
import { LinkFetchClient } from './link-fetch-client'

export interface RPCLinkOptions<T extends ClientContext>
  extends StandardRPCLinkOptions<T>, LinkFetchClientOptions<T> {}

export class RPCLink<T extends ClientContext> implements ClientLink<T> {
  private readonly standardLink: StandardLink<T>

  constructor(options: RPCLinkOptions<T>) {
    const jsonSerializer = new StandardRPCJsonSerializer(options)
    const serializer = new StandardRPCSerializer(jsonSerializer)
    const linkCodec = new StandardRPCLinkCodec(serializer, options)
    const linkClient = new LinkFetchClient(options)

    this.standardLink = new StandardLink(linkCodec, linkClient, options)
  }

  async call(path: readonly string[], input: unknown, options: ClientOptions<T>): Promise<unknown> {
    return this.standardLink.call(path, input, options)
  }
}
