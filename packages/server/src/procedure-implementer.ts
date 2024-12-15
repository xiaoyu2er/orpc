import type { ContractProcedure, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { DecoratedLazy } from './lazy'
import type { ANY_MAP_INPUT_MIDDLEWARE, ANY_MIDDLEWARE, MapInputMiddleware, Middleware } from './middleware'
import type { ProcedureFunc } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { Context, MergeContext } from './types'
import { decorateMiddleware } from './middleware'
import { Procedure } from './procedure'
import { decorateProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'

export type ProcedureImplementerDef<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
> = {
  contract: ContractProcedure<TInputSchema, TOutputSchema>
  middlewares?: Middleware<MergeContext<TContext, TExtraContext>, TExtraContext, SchemaOutput<TInputSchema>, SchemaInput<TOutputSchema>>[]
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

  use<U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      U,
      SchemaOutput<TInputSchema>,
      SchemaInput<TOutputSchema>
    >,
  ): ProcedureImplementer<
    TContext,
    MergeContext<TExtraContext, U>,
    TInputSchema,
    TOutputSchema
  >

  use<
    UExtra extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined,
    UInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtra,
      UInput,
      SchemaInput<TOutputSchema>
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UInput>,
  ): ProcedureImplementer<
    TContext,
    MergeContext<TExtraContext, UExtra>,
    TInputSchema,
    TOutputSchema
  >

  use(
    middleware: ANY_MIDDLEWARE,
    mapInput?: ANY_MAP_INPUT_MIDDLEWARE,
  ): ProcedureImplementer<any, any, any, any> {
    const mappedMiddleware = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new ProcedureImplementer({
      ...this['~orpc'],
      middlewares: [...(this['~orpc'].middlewares ?? []), mappedMiddleware],
    })
  }

  func<UFuncOutput extends SchemaInput<TOutputSchema>>(
    func: ProcedureFunc<TContext, TExtraContext, TInputSchema, TOutputSchema, UFuncOutput>,
  ): DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, UFuncOutput > {
    return decorateProcedure(new Procedure({
      middlewares: this['~orpc'].middlewares,
      contract: this['~orpc'].contract,
      func,
    }))
  }

  lazy<U extends Procedure<TContext, TExtraContext, TInputSchema, TOutputSchema, SchemaInput<TOutputSchema>>>(
    loader: () => Promise<{ default: U }>,
  ): DecoratedLazy<U> {
    // TODO: replace with a more solid solution
    return new RouterBuilder<TContext, TExtraContext>(this['~orpc']).lazy(loader as any) as any
  }
}
