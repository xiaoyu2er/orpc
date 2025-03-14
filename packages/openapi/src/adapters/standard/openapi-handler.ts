import type { Context } from '@orpc/server'
import type { StandardHandlerOptions } from '@orpc/server/standard'

export interface StandardOpenAPIHandlerOptions<T extends Context> extends StandardHandlerOptions<T> {}
