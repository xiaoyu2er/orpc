import type { ClientContext } from '@orpc/client'
import type { AnyContractRouter } from './router'
import type { ContractRouterClient } from './router-client'

export * from './builder'
export * from './builder-variants'
export * from './config'
export * from './error'
export * from './event-iterator'
export * from './lazy'
export * from './meta'
export * from './procedure'
export * from './procedure-client'
export * from './route'
export * from './router'
export * from './router-client'
export * from './router-utils'
export * from './schema'

export { ORPCError } from '@orpc/client'

/**
 * A sugar wrapper for `ContractRouterClient`
 */
export type RouterClient<
  T extends AnyContractRouter,
  TClientContext extends ClientContext = Record<never, never>,
> = ContractRouterClient<T, TClientContext>
