import { ContractProcedure, HTTPMethod, HTTPPath, SchemaInput, SchemaOutput } from '@orpc/contract'
import { Middleware } from './middleware'
import { Context, MergeContext, Promisable } from './types'

export class Procedure<
  TContext extends Context = any,
  TContract extends ContractProcedure = any,
  TExtraContext extends Context = any,
  THandlerOutput extends TContract extends ContractProcedure<any, infer UOutputSchema>
    ? SchemaOutput<UOutputSchema>
    : never = any
> {
  constructor(
    public __p: {
      middlewares?: Middleware[]
      contract: TContract
      handler: ProcedureHandler<MergeContext<TContext, TExtraContext>, TContract, THandlerOutput>
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
  TContext extends Context = any,
  TContract extends ContractProcedure = any,
  TOutput extends TContract extends ContractProcedure<any, infer UOutputSchema>
    ? SchemaOutput<UOutputSchema>
    : never = any
> = {
  (
    input: TContract extends ContractProcedure<infer UInputSchema>
      ? SchemaOutput<UInputSchema>
      : never,
    context: TContext,
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

export function isProcedure(item: unknown): item is Procedure {
  if (item instanceof Procedure) return true

  try {
    const anyItem = item as any
    return typeof anyItem.__p.contract === 'string' && typeof anyItem.__p.handler === 'function'
  } catch {
    return false
  }
}
