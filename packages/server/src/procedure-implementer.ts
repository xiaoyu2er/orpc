import type { ContractProcedure, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { DecoratedLazy } from './lazy'
import type { ProcedureFunc } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { Context, MergeContext } from './types'
import { decorateMiddleware, type MapInputMiddleware, type Middleware } from './middleware'
import { Procedure } from './procedure'
import { decorateProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'

export type ProcedureImplementerDef<
  _TContext extends Context,
  _TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
> = {
  contract: ContractProcedure<TInputSchema, TOutputSchema>
  middlewares?: Middleware<any, any, any, any>[]
}

export class ProcedureImplementer<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
> {
  '~type' = 'ProcedureImplementer' as const
  '~orpc': ProcedureImplementerDef<TContext, TExtraContext, TInputSchema, TOutputSchema>

  constructor(def: ProcedureImplementerDef<TContext, TExtraContext, TInputSchema, TOutputSchema>) {
    this['~orpc'] = def
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
    const mappedMiddleware = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : decorateMiddleware(middleware)

    return new ProcedureImplementer({
      ...this['~orpc'],
      middlewares: [...(this['~orpc'].middlewares ?? []), mappedMiddleware],
    })
  }

  func<UFuncOutput extends SchemaOutput<TOutputSchema>>(
    func: ProcedureFunc<TContext, TExtraContext, TInputSchema, TOutputSchema, UFuncOutput >,
  ): DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, UFuncOutput > {
    return decorateProcedure(new Procedure({
      middlewares: this['~orpc'].middlewares,
      contract: this['~orpc'].contract,
      func,
    }))
  }

  lazy<U extends Procedure<TContext, TExtraContext, TInputSchema, TOutputSchema, SchemaOutput<TOutputSchema>>>(
    loader: () => Promise<{ default: U }>,
  ): DecoratedLazy<U> {
    // TODO: replace with a more solid solution
    return new RouterBuilder<TContext, TExtraContext>(this['~orpc']).lazy(loader as any) as any
  }
}
