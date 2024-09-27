import { ContractProcedure, ContractRouter, isContractProcedure } from '@orpc/contract'
import { createExtendedMiddleware, ExtendedMiddleware, Middleware } from './middleware'
import { createProcedureBuilder, ProcedureBuilder } from './procedure-builder'
import { RouterBuilder } from './router-builder'
import { Context, MergeContext } from './types'

export interface Builder<TContext extends Context = any, TExtraContext extends Context = any> {
  __b: {
    middlewares: Middleware[]
  }

  context<UContext extends Context>(): Builder<UContext>

  middleware<UExtraContext extends Context, TInput = unknown>(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtraContext, TInput>
  ): ExtendedMiddleware<MergeContext<TContext, TExtraContext>, UExtraContext, TInput>

  use<UExtraContext extends Context>(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtraContext>
  ): Builder<TContext, MergeContext<TExtraContext, UExtraContext>>

  use<UExtraContext extends Context, UMappedInput = unknown>(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtraContext, UMappedInput>,
    mapInput: (input: unknown) => UMappedInput
  ): Builder<TContext, MergeContext<TExtraContext, UExtraContext>>

  contract<UContract extends ContractProcedure | ContractRouter>(
    contract: UContract
  ): UContract extends ContractProcedure
    ? ProcedureBuilder<TContext, UContract, TExtraContext>
    : RouterBuilder<TContext, UContract>
}

export function createBuilder<TContext extends Context = any>(): Builder<TContext> {
  const __b = {
    middlewares: [] as any[],
  }

  const builder: Builder<TContext> = {
    __b: __b,
    context() {
      return builder as any
    },

    contract(contract) {
      if (isContractProcedure(contract)) {
        const routeBuilder = createProcedureBuilder(contract)

        for (const middleware of __b.middlewares) {
          routeBuilder.use(middleware)
        }

        return routeBuilder
      }

      return new RouterBuilder<TContext, typeof contract>() as any
    },

    middleware(middleware) {
      return createExtendedMiddleware(middleware)
    },

    use(...args: any[]) {
      const [middleware, mapInput] = args

      if (typeof mapInput === 'function') {
        __b.middlewares.push(
          new Proxy(middleware, {
            apply(_target, _thisArg, [input, ...rest]) {
              return middleware(mapInput(input), ...(rest as [any, any]))
            },
          })
        )
      } else {
        __b.middlewares.push(middleware)
      }

      return builder
    },
  }

  return builder
}
