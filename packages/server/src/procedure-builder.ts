import { ContractProcedure, SchemaOutput } from '@orpc/contract'
import { Middleware } from './middleware'
import { Procedure, ProcedureHandler } from './procedure'
import { Context, MergeContext } from './types'

export interface ProcedureBuilder<
  TContext extends Context = any,
  TContract extends ContractProcedure = any,
  TExtraContext extends Context = any
> {
  __pb: {
    middlewares: Middleware[]
  }

  use<UExtraContext extends Context>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      TContract extends ContractProcedure<infer UInputSchema> ? SchemaOutput<UInputSchema> : never
    >
  ): ProcedureBuilder<TContext, TContract, MergeContext<TExtraContext, UExtraContext>>

  use<
    UExtraContext extends Context,
    UMappedInput = TContract extends ContractProcedure<infer UInputSchema>
      ? SchemaOutput<UInputSchema>
      : never
  >(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtraContext, UMappedInput>,
    mapInput: (
      input: TContract extends ContractProcedure<infer UInputSchema>
        ? SchemaOutput<UInputSchema>
        : never
    ) => UMappedInput
  ): ProcedureBuilder<TContext, TContract, MergeContext<TExtraContext, UExtraContext>>

  handler<
    UHandlerOutput extends TContract extends ContractProcedure<any, infer UOutputSchema>
      ? SchemaOutput<UOutputSchema>
      : never
  >(
    handler: ProcedureHandler<MergeContext<TContext, TExtraContext>, TContract, UHandlerOutput>
  ): Procedure<TContext, TContract, TExtraContext, UHandlerOutput>
}

export function createProcedureBuilder<
  TContext extends Context = any,
  TContract extends ContractProcedure = any,
  TExtraContext extends Context = any
>(contract: TContract): ProcedureBuilder<TContext, TContract, TExtraContext> {
  const __pb = {
    middlewares: [] as any[],
  }

  const builder: ProcedureBuilder<TContext, TContract, TExtraContext> = {
    __pb: __pb,
    use(...args: any[]) {
      const [middleware, mapInput] = args

      if (typeof mapInput === 'function') {
        __pb.middlewares.push(
          new Proxy(middleware, {
            apply(_target, _thisArg, [input, ...rest]) {
              return middleware(mapInput(input), ...(rest as [any, any]))
            },
          })
        )
      } else {
        __pb.middlewares.push(middleware)
      }

      return builder
    },
    handler(handler) {
      return new Procedure({
        contract,
        handler,
      })
    },
  }

  return builder
}
