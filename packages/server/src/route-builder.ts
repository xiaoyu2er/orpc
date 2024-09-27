import { ContractRoute, SchemaOutput } from '@orpc/contract'
import { ServerMiddleware } from './middleware'
import { ServerRoute, ServerRouteHandler } from './route'
import { MergeServerContext, ServerContext } from './types'

export interface ServerRouteBuilder<
  TContext extends ServerContext = any,
  TContract extends ContractRoute = any,
  TExtraContext extends ServerContext = any
> {
  __srb: {
    middlewares: ServerMiddleware[]
  }

  use<UExtraContext extends ServerContext>(
    middleware: ServerMiddleware<
      MergeServerContext<TContext, TExtraContext>,
      UExtraContext,
      TContract extends ContractRoute<infer UInputSchema> ? SchemaOutput<UInputSchema> : never
    >
  ): ServerRouteBuilder<TContext, TContract, MergeServerContext<TExtraContext, UExtraContext>>

  use<
    UExtraContext extends ServerContext,
    UMappedInput = TContract extends ContractRoute<infer UInputSchema>
      ? SchemaOutput<UInputSchema>
      : never
  >(
    middleware: ServerMiddleware<
      MergeServerContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput
    >,
    mapInput: (
      input: TContract extends ContractRoute<infer UInputSchema>
        ? SchemaOutput<UInputSchema>
        : never
    ) => UMappedInput
  ): ServerRouteBuilder<TContext, TContract, MergeServerContext<TExtraContext, UExtraContext>>

  handler<
    UHandlerOutput extends TContract extends ContractRoute<any, infer UOutputSchema>
      ? SchemaOutput<UOutputSchema>
      : never
  >(
    handler: ServerRouteHandler<
      MergeServerContext<TContext, TExtraContext>,
      TContract,
      UHandlerOutput
    >
  ): ServerRoute<TContext, TContract, TExtraContext, UHandlerOutput>
}

export function createServerRouteBuilder<
  TContext extends ServerContext = any,
  TContract extends ContractRoute = any,
  TExtraContext extends ServerContext = any
>(contract: TContract): ServerRouteBuilder<TContext, TContract, TExtraContext> {
  const __srb = {
    middlewares: [] as any[],
  }

  const builder: ServerRouteBuilder<TContext, TContract, TExtraContext> = {
    __srb,
    use(...args: any[]) {
      const [middleware, mapInput] = args

      if (typeof mapInput === 'function') {
        __srb.middlewares.push(
          new Proxy(middleware, {
            apply(_target, _thisArg, [input, ...rest]) {
              return middleware(mapInput(input), ...(rest as [any, any]))
            },
          })
        )
      } else {
        __srb.middlewares.push(middleware)
      }

      return builder
    },
    handler(handler) {
      return new ServerRoute({
        contract,
        handler,
      })
    },
  }

  return builder
}
