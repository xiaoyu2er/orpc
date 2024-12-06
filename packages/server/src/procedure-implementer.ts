import type { ContractProcedure, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { DecoratedLazy } from './lazy'
import type { DecoratedProcedure, Procedure, ProcedureFunc } from './procedure'
import type { Context, MergeContext } from './types'
import {
  decorateMiddleware,
  type MapInputMiddleware,
  type Middleware,
} from './middleware'
import { decorateProcedure } from './procedure'
import { RouterBuilder } from './router-builder'

export class ProcedureImplementer<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
> {
  constructor(
    public zz$pi: {
      contract: ContractProcedure<TInputSchema, TOutputSchema>
      middlewares?: Middleware<any, any, any, any>[]
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
      SchemaInput<TOutputSchema>
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
      SchemaInput<TOutputSchema>
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

  func<UFuncOutput extends SchemaOutput<TOutputSchema>>(
    func: ProcedureFunc<
      TContext,
      TExtraContext,
      TInputSchema,
      TOutputSchema,
      UFuncOutput
    >,
  ): DecoratedProcedure<
      TContext,
      TExtraContext,
      TInputSchema,
      TOutputSchema,
      UFuncOutput
    > {
    return decorateProcedure({
      zz$p: {
        middlewares: this.zz$pi.middlewares,
        contract: this.zz$pi.contract,
        func,
      },
    })
  }

  lazy<U extends Procedure<TContext, TExtraContext, TInputSchema, TOutputSchema, SchemaOutput<TOutputSchema>>>(
    loader: () => Promise<{ default: U }>,
  ): DecoratedLazy<U> {
    // TODO: replace with a more solid solution
    return new RouterBuilder<TContext, TExtraContext>(this.zz$pi).lazy(loader as any) as any
  }
}
