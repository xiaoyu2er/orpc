import type {
  ContractProcedure,
  DecoratedContractProcedure,
  SchemaOutput,
} from '@orpc/contract'
import type { MapInputMiddleware, Middleware } from './middleware'
import { DecoratedProcedure, type ProcedureHandler } from './procedure'
import type { Context, MergeContext } from './types'

export class ProcedureImplementer<
  TContext extends Context,
  TContract extends ContractProcedure<any, any>,
  TExtraContext extends Context,
> {
  constructor(
    public zz$pi: {
      contract: TContract
      middlewares?: Middleware<TContext, any, any, any>[]
    },
  ) {}

  use<
    UExtraContext extends
      | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
      | undefined = undefined,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      TContract extends ContractProcedure<infer UInputSchema, any>
        ? SchemaOutput<UInputSchema>
        : never,
      TContract extends ContractProcedure<any, infer UOutputSchema>
        ? SchemaOutput<UOutputSchema>
        : never
    >,
  ): ProcedureImplementer<
    TContext,
    TContract,
    MergeContext<TExtraContext, UExtraContext>
  >

  use<
    UExtraContext extends
      | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
      | undefined = undefined,
    UMappedInput = TContract extends ContractProcedure<infer UInputSchema, any>
      ? SchemaOutput<UInputSchema>
      : never,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      TContract extends ContractProcedure<any, infer UOutputSchema>
        ? SchemaOutput<UOutputSchema>
        : never
    >,
    mapInput: MapInputMiddleware<
      TContract extends ContractProcedure<infer UInputSchema, any>
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
      ...this.zz$pi,
      middlewares: [...(this.zz$pi.middlewares ?? []), middleware],
    })
  }

  handler<
    UHandlerOutput extends TContract extends ContractProcedure<
      any,
      infer UOutputSchema
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
  ): DecoratedProcedure<TContext, TContract, TExtraContext, UHandlerOutput> {
    return new DecoratedProcedure({
      middlewares: this.zz$pi.middlewares,
      contract: this.zz$pi.contract,
      handler,
    })
  }
}
