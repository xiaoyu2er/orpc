import type { ClientContext } from '../../types'
import type { StandardRPCLinkOptions } from '../standard'
import type { LinkFetchClientOptions } from './link-fetch-client'
import { StandardLink, StandardRPCJsonSerializer, StandardRPCLinkCodec, StandardRPCSerializer } from '../standard'
import { LinkFetchClient } from './link-fetch-client'

export interface RPCLinkOptions<T extends ClientContext>
  extends StandardRPCLinkOptions<T>, LinkFetchClientOptions<T> {}

export class RPCLink<T extends ClientContext> extends StandardLink<T> {
  constructor(options: RPCLinkOptions<T>) {
    const jsonSerializer = new StandardRPCJsonSerializer(options)
    const serializer = new StandardRPCSerializer(jsonSerializer)
    const linkCodec = new StandardRPCLinkCodec(serializer, options)
    const linkClient = new LinkFetchClient(options)

    super(linkCodec, linkClient, options)
  }
}
