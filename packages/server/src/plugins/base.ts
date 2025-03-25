import type { StandardHandlerOptions } from '../adapters/standard'
import type { Context } from '../context'

export interface HandlerPlugin<TContext extends Context> {
  init?(options: StandardHandlerOptions<TContext>): void
}
