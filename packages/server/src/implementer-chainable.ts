import type { Middleware } from './middleware'
import type { Context, MergeContext, WELL_CONTEXT } from './types'
import { type ContractProcedure, type ContractRouter, isContractProcedure } from '@orpc/contract'
import { ProcedureImplementer } from './procedure-implementer'
import { RouterImplementer } from './router-implementer'

export type ChainableImplementer<
  TContext extends Context,
  TExtraContext extends Context,
  TContract extends ContractRouter,
> = TContract extends ContractProcedure<infer UInputSchema, infer UOutputSchema>
  ? ProcedureImplementer<TContext, TExtraContext, UInputSchema, UOutputSchema>
  : {
    [K in keyof TContract]: TContract[K] extends ContractRouter ? ChainableImplementer<TContext, TExtraContext, TContract[K]> : never
  } & Omit<RouterImplementer<TContext, TExtraContext, TContract>, '~type' | '~orpc'>

export function createChainableImplementer<
  TContext extends Context = WELL_CONTEXT,
  TExtraContext extends Context = undefined,
  TContract extends ContractRouter = any,
>(
  contract: TContract,
  middlewares?: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any>[],
): ChainableImplementer<TContext, TExtraContext, TContract> {
  if (isContractProcedure(contract)) {
    const implementer = new ProcedureImplementer({
      contract,
      middlewares,
    })

    return implementer as any
  }

  const chainable: Record<string, unknown> = {}

  for (const key in contract) {
    chainable[key] = createChainableImplementer(contract[key]!, middlewares)
  }

  const routerImplementer = new RouterImplementer({ contract, middlewares })

  const merged = new Proxy(chainable, {
    get(target, key) {
      const next = Reflect.get(target, key)
      const method = Reflect.get(routerImplementer, key)

      if (typeof key !== 'string' || typeof method !== 'function') {
        return next
      }

      return new Proxy(method.bind(routerImplementer), {
        get(target, key) {
          // TODO: create own utils for object callable proxy
          if (
            typeof key !== 'string'
            || !next
            || (typeof next !== 'object' && typeof next !== 'function')
            || !(key in next)
          ) {
            return Reflect.get(target, key)
          }

          return next[key]
        },
      })
    },
  })

  return merged as any
}
