import type { StandardHandlerOptions } from '../adapters/standard'
import type { Context } from '../context'

export interface Plugin<TContext extends Context> {
  init?(options: StandardHandlerOptions<TContext>): void
}

export class CompositePlugin<TContext extends Context> implements Plugin<TContext> {
  constructor(private readonly plugins: Plugin<TContext>[] = []) {}

  init(options: StandardHandlerOptions<TContext>): void {
    for (const plugin of this.plugins) {
      plugin.init?.(options)
    }
  }
}
