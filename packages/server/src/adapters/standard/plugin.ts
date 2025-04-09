import type { Context } from '../../context'
import type { StandardHandlerOptions } from './handler'

export interface StandardHandlerPlugin<TContext extends Context> {
  order?: number
  init?(options: StandardHandlerOptions<TContext>): void
}

export class CompositeStandardHandlerPlugin<T extends Context, TPlugin extends StandardHandlerPlugin<T>> implements StandardHandlerPlugin<T> {
  protected readonly plugins: TPlugin[]

  constructor(plugins: readonly TPlugin[] = []) {
    this.plugins = [...plugins].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  init(options: StandardHandlerOptions<T>): void {
    for (const plugin of this.plugins) {
      plugin.init?.(options)
    }
  }
}
