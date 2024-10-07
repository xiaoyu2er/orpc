import {
  type ContractProcedure,
  DecoratedContractProcedure,
  type HTTPPath,
  type SchemaInput,
  type SchemaOutput,
  isContractProcedure,
} from '@orpc/contract'
import type { Schema } from '@orpc/contract'
import {
  type MapInputMiddleware,
  type Middleware,
  decorateMiddleware,
} from './middleware'
import type { Context, MergeContext, Meta, Promisable } from './types'

export class Procedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaOutput<TOutputSchema>,
> {
  constructor(
    public zz$p: {
      middlewares?: Middleware<any, any, any, any>[]
      contract: ContractProcedure<TInputSchema, TOutputSchema>
      handler: ProcedureHandler<
        TContext,
        TExtraContext,
        TInputSchema,
        TOutputSchema,
        THandlerOutput
      >
    },
  ) {}
}

export class DecoratedProcedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaOutput<TOutputSchema>,
> extends Procedure<
  TContext,
  TExtraContext,
  TInputSchema,
  TOutputSchema,
  THandlerOutput
> {
  static decorate<
    TContext extends Context,
    TExtraContext extends Context,
    TInputSchema extends Schema,
    TOutputSchema extends Schema,
    THandlerOutput extends SchemaOutput<TOutputSchema>,
  >(
    p: Procedure<
      TContext,
      TExtraContext,
      TInputSchema,
      TOutputSchema,
      THandlerOutput
    >,
  ): DecoratedProcedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    THandlerOutput
  > {
    if (p instanceof DecoratedProcedure) return p
    return new DecoratedProcedure(p.zz$p)
  }

  prefix(
    prefix: HTTPPath,
  ): DecoratedProcedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    THandlerOutput
  > {
    return new DecoratedProcedure({
      ...this.zz$p,
      contract: DecoratedContractProcedure.decorate(this.zz$p.contract).prefix(
        prefix,
      ),
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
      SchemaOutput<TInputSchema>,
      SchemaOutput<TOutputSchema, THandlerOutput>
    >,
  ): DecoratedProcedure<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInputSchema,
    TOutputSchema,
    THandlerOutput
  >

  use<
    UExtraContext extends
      | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
      | undefined = undefined,
    UMappedInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      SchemaOutput<TOutputSchema, THandlerOutput>
    >,
    mapInput: MapInputMiddleware<
      SchemaOutput<TInputSchema, THandlerOutput>,
      UMappedInput
    >,
  ): DecoratedProcedure<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInputSchema,
    TOutputSchema,
    THandlerOutput
  >

  use(
    middleware: Middleware<any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): DecoratedProcedure<any, any, any, any, any> {
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
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TOutput extends SchemaOutput<TOutputSchema>,
> {
  (
    input: SchemaOutput<TInputSchema>,
    context: MergeContext<TContext, TExtraContext>,
    meta: Meta<unknown>,
  ): Promisable<SchemaInput<TOutputSchema, TOutput>>
}

export type WELL_DEFINED_PROCEDURE = Procedure<
  Context,
  Context,
  Schema,
  Schema,
  unknown
>

export function isProcedure(item: unknown): item is WELL_DEFINED_PROCEDURE {
  if (item instanceof Procedure) return true

  try {
    const anyItem = item as WELL_DEFINED_PROCEDURE

    return (
      isContractProcedure(anyItem.zz$p.contract) &&
      typeof anyItem.zz$p.handler === 'function'
    )
  } catch {
    return false
  }
}
