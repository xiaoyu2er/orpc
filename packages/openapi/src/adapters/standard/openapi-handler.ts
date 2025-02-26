import type { Context } from '@orpc/server'
import type { RPCHandlerOptions } from '@orpc/server/standard'

export interface OpenAPIHandlerOptions<T extends Context> extends RPCHandlerOptions<T> {}
