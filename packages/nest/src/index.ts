import type { AnyContractRouter } from '@orpc/contract'
import type { BuilderConfig, ImplementerInternal } from '@orpc/server'
import { implementerInternal } from '@orpc/server'

export * from './decorator'
export * from './interceptor'
export * from './utils'

export { ORPCError } from '@orpc/server'

export function implement<T extends AnyContractRouter>(
  contract: T,
  config: BuilderConfig = {},
): ImplementerInternal<T, Record<never, never>, Record<never, never>> {
  return implementerInternal(contract, config, [])
}
