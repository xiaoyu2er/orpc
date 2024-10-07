import type { ContractProcedure, SchemaOutput } from '@orpc/contract'
import type { Schema } from '@orpc/contract'
import {
  type MapInputMiddleware,
  type Middleware,
  decorateMiddleware,
} from './middleware'
import { DecoratedProcedure, type ProcedureHandler } from './procedure'
import type { Context, MergeContext } from './types'

export class ProcedureImplementer<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
> {
  constructor(
    public zz$pi: {
      contract: ContractProcedure<TInputSchema, TOutputSchema>
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
      SchemaOutput<TInputSchema>,
      SchemaOutput<TOutputSchema>
    >,
  ): ProcedureImplementer<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInputSchema,
    TOutputSchema
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
      SchemaOutput<TOutputSchema>
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UMappedInput>,
  ): ProcedureImplementer<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInputSchema,
    TOutputSchema
  >

  use(
    middleware: Middleware<any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): ProcedureImplementer<any, any, any, any> {
    const middleware_ = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new ProcedureImplementer({
      ...this.zz$pi,
      middlewares: [...(this.zz$pi.middlewares ?? []), middleware_],
    })
  }

  handler<UHandlerOutput extends SchemaOutput<TOutputSchema>>(
    handler: ProcedureHandler<
      TContext,
      TExtraContext,
      TInputSchema,
      TOutputSchema,
      UHandlerOutput
    >,
  ): DecoratedProcedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    UHandlerOutput
  > {
    return new DecoratedProcedure({
      middlewares: this.zz$pi.middlewares,
      contract: this.zz$pi.contract,
      handler,
    })
  }
}
