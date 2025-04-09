import type { StandardRPCJsonSerializerOptions } from '@orpc/client/standard'
import type { Context } from '../../context'
import type { StandardHandlerOptions } from './handler'
import { StrictGetMethodPlugin } from '../../plugins'

export interface StandardRPCHandlerOptions<T extends Context> extends StandardHandlerOptions<T>, StandardRPCJsonSerializerOptions {
  /**
   * Enables or disables the StrictGetMethodPlugin.
   *
   * @default true
   */
  strictGetMethodPluginEnabled?: boolean
}

export function initDefaultStandardRPCHandlerOptions<T extends Context>(options: StandardRPCHandlerOptions<T>): void {
  options.plugins ??= []

  const strictGetMethodPluginEnabled = options.strictGetMethodPluginEnabled ?? true

  if (strictGetMethodPluginEnabled) {
    options.plugins.push(new StrictGetMethodPlugin())
  }
}
