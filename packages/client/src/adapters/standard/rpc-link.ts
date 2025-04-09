import type { ClientContext } from '../../types'
import type { StandardLinkClient } from './types'
import { StandardLink, type StandardLinkOptions } from './link'
import { StandardRPCJsonSerializer, type StandardRPCJsonSerializerOptions } from './rpc-json-serializer'
import { StandardRPCLinkCodec, type StandardRPCLinkCodecOptions } from './rpc-link-codec'
import { StandardRPCSerializer } from './rpc-serializer'

export interface StandardRPCLinkOptions<T extends ClientContext>
  extends StandardLinkOptions<T>, StandardRPCLinkCodecOptions<T>, StandardRPCJsonSerializerOptions {}

export class StandardRPCLink<T extends ClientContext> extends StandardLink<T> {
  constructor(linkClient: StandardLinkClient<T>, options: StandardRPCLinkOptions<T>) {
    const jsonSerializer = new StandardRPCJsonSerializer(options)
    const serializer = new StandardRPCSerializer(jsonSerializer)
    const linkCodec = new StandardRPCLinkCodec(serializer, options)

    super(linkCodec, linkClient, options)
  }
}
