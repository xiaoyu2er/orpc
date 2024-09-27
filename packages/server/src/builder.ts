import { ContractRoute, ContractRouter, isContractRoute } from '@orpc/contract'
import {
  createExtendedServerMiddleware,
  ExtendedServerMiddleware,
  ServerMiddleware,
} from './middleware'
import { createServerRouteBuilder, ServerRouteBuilder } from './route-builder'
import { ServerRouterBuilder } from './router-builder'
import { MergeServerContext, ServerContext } from './types'

export interface ServerBuilder<
  TContext extends ServerContext = any,
  TExtraContext extends ServerContext = any
> {
  __sb: {
    middlewares: ServerMiddleware[]
  }

  context<UContext extends ServerContext>(): ServerBuilder<UContext>

  middleware<UExtraContext extends ServerContext, TInput = unknown>(
    middleware: ServerMiddleware<MergeServerContext<TContext, TExtraContext>, UExtraContext, TInput>
  ): ExtendedServerMiddleware<MergeServerContext<TContext, TExtraContext>, UExtraContext, TInput>

  use<UExtraContext extends ServerContext>(
    middleware: ServerMiddleware<MergeServerContext<TContext, TExtraContext>, UExtraContext>
  ): ServerBuilder<TContext, MergeServerContext<TExtraContext, UExtraContext>>

  use<UExtraContext extends ServerContext, UMappedInput = unknown>(
    middleware: ServerMiddleware<
      MergeServerContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput
    >,
    mapInput: (input: unknown) => UMappedInput
  ): ServerBuilder<TContext, MergeServerContext<TExtraContext, UExtraContext>>

  contract<UContract extends ContractRoute | ContractRouter>(
    contract: UContract
  ): UContract extends ContractRoute
    ? ServerRouteBuilder<TContext, UContract, TExtraContext>
    : ServerRouterBuilder<TContext, UContract>
}

export function createServerBuilder<
  TContext extends ServerContext = any
>(): ServerBuilder<TContext> {
  const __sb = {
    middlewares: [] as any[],
  }

  const builder: ServerBuilder<TContext> = {
    __sb,
    context() {
      return builder as any
    },

    contract(contract) {
      if (isContractRoute(contract)) {
        const routeBuilder = createServerRouteBuilder(contract)

        for (const middleware of __sb.middlewares) {
          routeBuilder.use(middleware)
        }

        return routeBuilder
      }

      return new ServerRouterBuilder<TContext, typeof contract>() as any
    },

    middleware(middleware) {
      return createExtendedServerMiddleware(middleware)
    },

    use(...args: any[]) {
      const [middleware, mapInput] = args

      if (typeof mapInput === 'function') {
        __sb.middlewares.push(
          new Proxy(middleware, {
            apply(_target, _thisArg, [input, ...rest]) {
              return middleware(mapInput(input), ...(rest as [any, any]))
            },
          })
        )
      } else {
        __sb.middlewares.push(middleware)
      }

      return builder
    },
  }

  return builder
}
