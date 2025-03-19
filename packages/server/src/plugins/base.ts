import type { StandardHandlerOptions } from '../adapters/standard'
import type { Context } from '../context'

export interface HandlerPlugin<TContext extends Context> {
  init?(options: StandardHandlerOptions<TContext>): void
}

export class CompositeHandlerPlugin<TContext extends Context> implements HandlerPlugin<TContext> {
  constructor(private readonly plugins: HandlerPlugin<TContext>[] = []) {}

  init(options: StandardHandlerOptions<TContext>): void {
    for (const plugin of this.plugins) {
      plugin.init?.(options)
    }
  }
}
