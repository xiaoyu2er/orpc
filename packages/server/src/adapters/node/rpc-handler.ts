import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardRPCHandlerOptions } from '../standard'
import type { NodeHttpHandlerOptions } from './handler'
import { StandardRPCJsonSerializer, StandardRPCSerializer } from '@orpc/client/standard'
import { StandardHandler, StandardRPCCodec, StandardRPCMatcher } from '../standard'
import { NodeHttpHandler } from './handler'

export class RPCHandler<T extends Context> extends NodeHttpHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<StandardRPCHandlerOptions<T> & NodeHttpHandlerOptions<T>> = {}) {
    const jsonSerializer = new StandardRPCJsonSerializer(options)
    const serializer = new StandardRPCSerializer(jsonSerializer)
    const matcher = new StandardRPCMatcher()
    const codec = new StandardRPCCodec(serializer)

    super(new StandardHandler(router, matcher, codec, options), options)
  }
}
