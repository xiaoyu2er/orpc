import type { Context } from '../../context'
import type { StandardHandlerOptions } from './handler'
import type { StandardCodec, StandardMatcher } from './types'

export interface RPCHandlerOptions<T extends Context> extends StandardHandlerOptions<T> {
  matcher?: StandardMatcher
  codec?: StandardCodec
}
