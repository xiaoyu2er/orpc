import type { Context } from '@orpc/server'
import type { RPCHandlerOptions } from '@orpc/server/standard'
import type { OpenAPICodecOptions } from './openapi-codec'
import type { OpenAPIMatcherOptions } from './openapi-matcher'

export interface OpenAPIHandlerOptions<T extends Context>
  extends RPCHandlerOptions<T>, OpenAPIMatcherOptions, OpenAPICodecOptions {}
