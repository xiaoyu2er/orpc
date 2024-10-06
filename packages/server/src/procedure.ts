import {
  type ContractProcedure,
  DecoratedContractProcedure,
  type HTTPPath,
  type SchemaInput,
  type SchemaOutput,
  type WELL_DEFINED_CONTRACT_PROCEDURE,
  isContractProcedure,
} from '@orpc/contract'
import type { MapInputMiddleware, Middleware } from './middleware'
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
    public zzProcedure: {
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
      ...this.zzProcedure,
      contract: new DecoratedContractProcedure(
        this.zzProcedure.contract.zzContractProcedure,
      ).prefix(prefix) as any,
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
    middleware_: Middleware<any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): DecoratedProcedure<any, any, any, any> {
    const middleware: Middleware<any, any, any, any> =
      typeof mapInput === 'function'
        ? (input, ...rest) => middleware_(mapInput(input), ...rest)
        : middleware_

    return new DecoratedProcedure({
      ...this.zzProcedure,
      middlewares: [middleware, ...(this.zzProcedure.middlewares ?? [])],
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

export type WELL_DEFINED_PROCEDURE = DecoratedProcedure<
  Context,
  WELL_DEFINED_CONTRACT_PROCEDURE,
  Context,
  unknown
>

export function isProcedure(item: unknown): item is WELL_DEFINED_PROCEDURE {
  if (item instanceof DecoratedProcedure) return true

  try {
    const anyItem = item as any

    return (
      isContractProcedure(anyItem.zzProcedure.contract) &&
      typeof anyItem.zzProcedure.handler === 'function'
    )
  } catch {
    return false
  }
}
