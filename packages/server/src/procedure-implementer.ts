import type { ContractProcedure, SchemaOutput } from '@orpc/contract'
import type { MapInputMiddleware, Middleware } from './middleware'
import { Procedure, type ProcedureHandler } from './procedure'
import type { Context, MergeContext } from './types'

export class ProcedureImplementer<
  TContext extends Context,
  TContract extends ContractProcedure<any, any, any, any>,
  TExtraContext extends Context,
> {
  constructor(
    public __pi: {
      contract: TContract
      middlewares?: Middleware<TContext, any, any, any>[]
    },
  ) {}

  use<
    UExtraContext extends Partial<
      MergeContext<Context, MergeContext<TContext, TExtraContext>>
    >,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      TContract extends ContractProcedure<infer UInputSchema, any, any, any>
        ? SchemaOutput<UInputSchema>
        : never,
      TContract extends ContractProcedure<any, infer UOutputSchema, any, any>
        ? SchemaOutput<UOutputSchema>
        : never
    >,
  ): ProcedureImplementer<
    TContext,
    TContract,
    MergeContext<TExtraContext, UExtraContext>
  >

  use<
    UExtraContext extends Partial<
      MergeContext<Context, MergeContext<TContext, TExtraContext>>
    >,
    UMappedInput = TContract extends ContractProcedure<
      infer UInputSchema,
      any,
      any,
      any
    >
      ? SchemaOutput<UInputSchema>
      : never,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      TContract extends ContractProcedure<any, infer UOutputSchema, any, any>
        ? SchemaOutput<UOutputSchema>
        : never
    >,
    mapInput: MapInputMiddleware<
      TContract extends ContractProcedure<infer UInputSchema, any, any, any>
        ? SchemaOutput<UInputSchema>
        : never,
      UMappedInput
    >,
  ): ProcedureImplementer<
    TContext,
    TContract,
    MergeContext<TExtraContext, UExtraContext>
  >

  use(
    middleware_: Middleware<any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): ProcedureImplementer<any, any, any> {
    const middleware: Middleware<any, any, any, any> =
      typeof mapInput === 'function'
        ? (input, ...rest) => middleware_(mapInput(input), ...rest)
        : middleware_

    return new ProcedureImplementer({
      ...this.__pi,
      middlewares: [...(this.__pi.middlewares ?? []), middleware],
    })
  }

  handler<
    UHandlerOutput extends TContract extends ContractProcedure<
      any,
      infer UOutputSchema,
      any,
      any
    >
      ? SchemaOutput<UOutputSchema>
      : never,
  >(
    handler: ProcedureHandler<
      TContext,
      TContract,
      TExtraContext,
      UHandlerOutput
    >,
  ): Procedure<TContext, TContract, TExtraContext, UHandlerOutput> {
    return new Procedure({
      middlewares: this.__pi.middlewares,
      contract: this.__pi.contract,
      handler,
    })
  }
}
