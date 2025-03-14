import type { ClientContext } from '../../types'
import type { StandardLinkOptions } from './link'
import type { StandardRPCJsonSerializerOptions } from './rpc-json-serializer'
import type { StandardRPCLinkCodecOptions } from './rpc-link-codec'

export interface StandardRPCLinkOptions<T extends ClientContext>
  extends StandardLinkOptions<T>, StandardRPCLinkCodecOptions<T>, StandardRPCJsonSerializerOptions {}
