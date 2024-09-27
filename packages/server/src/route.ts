import { ContractRoute, HTTPMethod, HTTPPath, SchemaInput, SchemaOutput } from '@orpc/contract'
import { MergeServerContext, Promisable, ServerContext } from './types'

export class ServerRoute<
  TContext extends ServerContext = any,
  TContract extends ContractRoute = any,
  TExtraContext extends ServerContext = any,
  THandlerOutput extends TContract extends ContractRoute<any, infer UOutputSchema>
    ? SchemaOutput<UOutputSchema>
    : never = any
> {
  constructor(
    public __sr: {
      contract: TContract
      handler: ServerRouteHandler<
        MergeServerContext<TContext, TExtraContext>,
        TContract,
        THandlerOutput
      >
    }
  ) {}
}

export type ServerRouteHandler<
  TContext extends ServerContext = any,
  TContract extends ContractRoute = any,
  TOutput extends TContract extends ContractRoute<any, infer UOutputSchema>
    ? SchemaOutput<UOutputSchema>
    : never = any
> = {
  (
    input: TContract extends ContractRoute<infer UInputSchema> ? SchemaOutput<UInputSchema> : never,
    context: TContext,
    meta: {
      method: HTTPMethod
      path: HTTPPath
    }
  ): Promisable<
    TContract extends ContractRoute<any, infer UOutputSchema>
      ? SchemaInput<UOutputSchema, TOutput>
      : never
  >
}

export function isServerRoute(item: unknown): item is ServerRoute {
  if (item instanceof ServerRoute) return true

  try {
    const anyItem = item as any
    return typeof anyItem.__sr.contract === 'string' && typeof anyItem.__sr.handler === 'function'
  } catch {
    return false
  }
}
