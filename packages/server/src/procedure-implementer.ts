import { ContractProcedure, SchemaOutput } from '@orpc/contract'
import { MapInputMiddleware, Middleware } from './middleware'
import { Procedure, ProcedureHandler } from './procedure'
import { Context, MergeContext } from './types'

export class ProcedureImplementer<
  TContext extends Context = any,
  TContract extends ContractProcedure = any,
  TExtraContext extends Context = any
> {
  constructor(
    public __pb: {
      contract: TContract
      middlewares?: Middleware[]
    }
  ) {}

  use<UExtraContext extends Context>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      TContract extends ContractProcedure<infer UInputSchema> ? SchemaOutput<UInputSchema> : never
    >
  ): ProcedureImplementer<TContext, TContract, MergeContext<TExtraContext, UExtraContext>>

  use<
    UExtraContext extends Context,
    UMappedInput = TContract extends ContractProcedure<infer UInputSchema>
      ? SchemaOutput<UInputSchema>
      : never
  >(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtraContext, UMappedInput>,
    mapInput: MapInputMiddleware<
      TContract extends ContractProcedure<infer UInputSchema> ? SchemaOutput<UInputSchema> : never,
      UMappedInput
    >
  ): ProcedureImplementer<TContext, TContract, MergeContext<TExtraContext, UExtraContext>>

  use(middleware_: Middleware, mapInput?: MapInputMiddleware): ProcedureImplementer {
    const middleware: Middleware =
      typeof mapInput === 'function'
        ? (input, ...rest) => middleware_(mapInput(input), ...rest)
        : middleware_

    return new ProcedureImplementer({
      ...this.__pb,
      middlewares: [...(this.__pb.middlewares ?? []), middleware],
    })
  }

  handler<
    UHandlerOutput extends TContract extends ContractProcedure<any, infer UOutputSchema>
      ? SchemaOutput<UOutputSchema>
      : never
  >(
    handler: ProcedureHandler<MergeContext<TContext, TExtraContext>, TContract, UHandlerOutput>
  ): Procedure<TContext, TContract, TExtraContext, UHandlerOutput> {
    return new Procedure({
      middlewares: this.__pb.middlewares,
      contract: this.__pb.contract,
      handler,
    })
  }
}
