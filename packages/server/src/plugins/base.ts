import type { StandardHandlerInterceptorOptions, StandardHandlerOptions, WellCreateProcedureClientOptions } from '../adapters/standard'
import type { Context } from '../context'

export interface Plugin<TContext extends Context> {
  init?(options: StandardHandlerOptions<TContext>): void

  beforeCreateProcedureClient?(
    clientOptions: WellCreateProcedureClientOptions<TContext>,
    interceptorOptions: StandardHandlerInterceptorOptions<TContext>
  ): void
}

export class CompositePlugin<TContext extends Context> implements Plugin<TContext> {
  constructor(private readonly plugins: Plugin<TContext>[] = []) {}

  init(options: StandardHandlerOptions<TContext>): void {
    for (const plugin of this.plugins) {
      plugin.init?.(options)
    }
  }

  beforeCreateProcedureClient(
    clientOptions: WellCreateProcedureClientOptions<TContext>,
    interceptorOptions: StandardHandlerInterceptorOptions<TContext>,
  ): void {
    for (const plugin of this.plugins) {
      plugin.beforeCreateProcedureClient?.(clientOptions, interceptorOptions)
    }
  }
}
