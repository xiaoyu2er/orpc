import type { MapInputMiddleware, Middleware } from './middleware'
import type { DecoratedProcedure } from './procedure-decorated'
import type { Context, MergeContext } from './types'
import {
  type ContractProcedure,
  DecoratedContractProcedure,
  type RouteOptions,
  type Schema,
  type SchemaInput,
  type SchemaOutput,
} from '@orpc/contract'
import {
  Procedure,
  type ProcedureFunc,
} from './procedure'
import { decorateProcedure } from './procedure-decorated'
import { ProcedureImplementer } from './procedure-implementer'

export interface ProcedureBuilderDef<
  _TContext extends Context,
  _TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
> {
  contract: ContractProcedure<TInputSchema, TOutputSchema>
  middlewares?: Middleware<any, any, any, any>[]
}

export class ProcedureBuilder<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
> {
  '~type' = 'ProcedureBuilder' as const
  '~orpc': ProcedureBuilderDef<TContext, TExtraContext, TInputSchema, TOutputSchema>

  constructor(def: ProcedureBuilderDef<TContext, TExtraContext, TInputSchema, TOutputSchema>) {
    this['~orpc'] = def
  }

  route(
    route: RouteOptions,
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .route(route),
    })
  }

  input<USchema extends Schema = undefined>(
    schema: USchema,
    example?: SchemaInput<USchema>,
  ): ProcedureBuilder<TContext, TExtraContext, USchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .input(schema, example),
    })
  }

  output<USchema extends Schema = undefined>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, USchema> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .output(schema, example),
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
    if (!mapInput) {
      return new ProcedureImplementer({
        contract: this['~orpc'].contract,
        middlewares: this['~orpc'].middlewares,
      }).use(middleware)
    }

    return new ProcedureImplementer({
      contract: this['~orpc'].contract,
      middlewares: this['~orpc'].middlewares,
    }).use(middleware, mapInput)
  }

  func<UFuncOutput extends SchemaOutput<TOutputSchema>>(
    func: ProcedureFunc<TContext, TExtraContext, TInputSchema, TOutputSchema, UFuncOutput>,
  ): DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, UFuncOutput > {
    return decorateProcedure(new Procedure({
      middlewares: this['~orpc'].middlewares,
      contract: this['~orpc'].contract,
      func,
    }))
  }
}
