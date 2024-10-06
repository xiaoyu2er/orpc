import {
  type ContractProcedure,
  DecoratedContractProcedure,
  type HTTPPath,
  type SchemaInput,
  type SchemaOutput,
  type WELL_DEFINED_CONTRACT_PROCEDURE,
  isContractProcedure,
} from '@orpc/contract'
import {
  type MapInputMiddleware,
  type Middleware,
  decorateMiddleware,
} from './middleware'
import type { Context, MergeContext, Meta, Promisable } from './types'

export class Procedure<
  TContext extends Context,
  TContract extends ContractProcedure<any, any>,
  TExtraContext extends Context,
  THandlerOutput extends TContract extends ContractProcedure<
    any,
    infer UOutputSchema
  >
    ? SchemaOutput<UOutputSchema>
    : never,
> {
  constructor(
    public zz$p: {
      middlewares?: Middleware<TContext, any, any, any>[]
      contract: TContract
      handler: ProcedureHandler<
        TContext,
        TContract,
        TExtraContext,
        THandlerOutput
      >
    },
  ) {}
}

export class DecoratedProcedure<
  TContext extends Context,
  TContract extends ContractProcedure<any, any>,
  TExtraContext extends Context,
  THandlerOutput extends TContract extends ContractProcedure<
    any,
    infer UOutputSchema
  >
    ? SchemaOutput<UOutputSchema>
    : never,
> extends Procedure<TContext, TContract, TExtraContext, THandlerOutput> {
  prefix(
    prefix: HTTPPath,
  ): DecoratedProcedure<TContext, TContract, TExtraContext, THandlerOutput> {
    return new DecoratedProcedure({
      ...this.zz$p,
      contract: new DecoratedContractProcedure(this.zz$p.contract.zz$cp).prefix(
        prefix,
      ) as any,
    })
  }

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
        ? SchemaOutput<UOutputSchema, THandlerOutput>
        : never
    >,
  ): DecoratedProcedure<
    TContext,
    TContract,
    MergeContext<TExtraContext, UExtraContext>,
    THandlerOutput
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
        ? SchemaOutput<UOutputSchema, THandlerOutput>
        : never
    >,
    mapInput: MapInputMiddleware<
      TContract extends ContractProcedure<infer UInputSchema, any>
        ? SchemaOutput<UInputSchema, THandlerOutput>
        : never,
      UMappedInput
    >,
  ): DecoratedProcedure<
    TContext,
    TContract,
    MergeContext<TExtraContext, UExtraContext>,
    THandlerOutput
  >

  use(
    middleware: Middleware<any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): DecoratedProcedure<any, any, any, any> {
    const middleware_ = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new DecoratedProcedure({
      ...this.zz$p,
      middlewares: [middleware_, ...(this.zz$p.middlewares ?? [])],
    })
  }
}

export interface ProcedureHandler<
  TContext extends Context,
  TContract extends ContractProcedure<any, any>,
  TExtraContext extends Context,
  TOutput extends TContract extends ContractProcedure<any, infer UOutputSchema>
    ? SchemaOutput<UOutputSchema>
    : never,
> {
  (
    input: TContract extends ContractProcedure<infer UInputSchema, any>
      ? SchemaOutput<UInputSchema>
      : never,
    context: MergeContext<TContext, TExtraContext>,
    meta: Meta<unknown>,
  ): Promisable<
    TContract extends ContractProcedure<any, infer UOutputSchema>
      ? SchemaInput<UOutputSchema, TOutput>
      : never
  >
}

export type WELL_DEFINED_PROCEDURE = Procedure<
  Context,
  WELL_DEFINED_CONTRACT_PROCEDURE,
  Context,
  unknown
>

export function isProcedure(item: unknown): item is WELL_DEFINED_PROCEDURE {
  if (item instanceof Procedure) return true

  try {
    const anyItem = item as any

    return (
      isContractProcedure(anyItem.zz$p.contract) &&
      typeof anyItem.zz$p.handler === 'function'
    )
  } catch {
    return false
  }
}
