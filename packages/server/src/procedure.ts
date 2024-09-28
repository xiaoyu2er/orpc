import { ContractProcedure, HTTPMethod, HTTPPath, SchemaInput, SchemaOutput } from '@orpc/contract'
import { Middleware } from './middleware'
import { Context, MergeContext, Promisable } from './types'

export class Procedure<
  TContext extends Context,
  TContract extends ContractProcedure<any, any>,
  TExtraContext extends Context,
  THandlerOutput extends TContract extends ContractProcedure<any, infer UOutputSchema>
    ? SchemaOutput<UOutputSchema>
    : never
> {
  constructor(
    public __p: {
      middlewares?: Middleware<any, any, any>[]
      contract: TContract
      handler: ProcedureHandler<TContext, TContract, TExtraContext, THandlerOutput>
    }
  ) {}

  prefix(prefix: HTTPPath): Procedure<TContext, TContract, TExtraContext, THandlerOutput> {
    return new Procedure({
      ...this.__p,
      contract: this.__p.contract.prefix(prefix) as any,
    })
  }
}

export type ProcedureHandler<
  TContext extends Context,
  TContract extends ContractProcedure<any, any>,
  TExtraContext extends Context,
  TOutput extends TContract extends ContractProcedure<any, infer UOutputSchema>
    ? SchemaOutput<UOutputSchema>
    : never
> = {
  (
    input: TContract extends ContractProcedure<infer UInputSchema, any>
      ? SchemaOutput<UInputSchema>
      : never,
    context: MergeContext<TContext, TExtraContext>,
    meta: {
      method: HTTPMethod
      path: HTTPPath
    }
  ): Promisable<
    TContract extends ContractProcedure<any, infer UOutputSchema>
      ? SchemaInput<UOutputSchema, TOutput>
      : never
  >
}

export function isProcedure(item: unknown): item is Procedure<any, any, any, any> {
  if (item instanceof Procedure) return true

  try {
    const anyItem = item as any
    return typeof anyItem.__p.contract === 'string' && typeof anyItem.__p.handler === 'function'
  } catch {
    return false
  }
}
