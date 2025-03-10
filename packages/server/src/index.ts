import type { InferRouterCurrentContexts, InferRouterInitialContexts, InferRouterInputs, InferRouterOutputs } from './router'

export * from './builder'
export * from './builder-variants'
export * from './config'
export * from './context'
export * from './hidden'
export * from './implementer'
export * from './implementer-procedure'
export * from './implementer-variants'
export * from './middleware'
export * from './middleware-decorated'
export * from './procedure'
export * from './procedure-client'
export * from './procedure-decorated'
export * from './procedure-utils'
export * from './router'
export * from './router-client'
export * from './router-utils'
export * from './utils'

export { isDefinedError, ORPCError, safe } from '@orpc/client'
export { eventIterator, type, ValidationError } from '@orpc/contract'
export type {
  ContractProcedure,
  ContractProcedureDef,
  ContractRouter,
  ErrorMap,
  ErrorMapItem,
  HTTPMethod,
  HTTPPath,
  InputStructure,
  Meta,
  ORPCErrorFromErrorMap,
  OutputStructure,
  Route,
  Schema,
  SchemaInput,
  SchemaOutput,
} from '@orpc/contract'
export { onError, onFinish, onStart, onSuccess } from '@orpc/shared'
export { getEventMeta, withEventMeta } from '@orpc/standard-server'

export type {
  /**
   * The alias of {@link InferRouterCurrentContexts}
   */
  InferRouterCurrentContexts as InferCurrentContexts,

  /**
   * The alias of {@link InferRouterInputs}
   */
  InferRouterInitialContexts as InferInitialContexts,

  /**
   * The alias of {@link InferRouterInputs}
   */
  InferRouterInputs as InferInputs,

  /**
   * The alias of {@link InferRouterOutputs}
   */
  InferRouterOutputs as InferOutputs,
}
