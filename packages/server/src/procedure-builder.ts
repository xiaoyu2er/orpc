import type {
  ContractProcedure,
  ErrorMap,
  RouteOptions,
  Schema,
  SchemaInput,
  SchemaOutput,
} from '@orpc/contract'
import type { ORPCErrorConstructorMap } from './error'
import type { MapInputMiddleware, Middleware } from './middleware'
import type {
  ProcedureHandler,
} from './procedure'
import type { Context, MergeContext } from './types'
import {
  DecoratedContractProcedure,
} from '@orpc/contract'
import { DecoratedProcedure } from './procedure-decorated'
import { ProcedureImplementer } from './procedure-implementer'

export interface ProcedureBuilderDef<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> {
  contract: ContractProcedure<TInputSchema, TOutputSchema, TErrorMap>
  middlewares: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any, Record<string, unknown>>[]
}

export class ProcedureBuilder<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> {
  '~type' = 'ProcedureBuilder' as const
  '~orpc': ProcedureBuilderDef<TContext, TExtraContext, TInputSchema, TOutputSchema, TErrorMap>

  constructor(def: ProcedureBuilderDef<TContext, TExtraContext, TInputSchema, TOutputSchema, TErrorMap>) {
    this['~orpc'] = def
  }

  route(route: RouteOptions): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema, TErrorMap> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .route(route),
    })
  }

  input<U extends Schema>(
    schema: U,
    example?: SchemaInput<U>,
  ): ProcedureBuilder<TContext, TExtraContext, U, TOutputSchema, TErrorMap> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .input(schema, example),
    })
  }

  output<U extends Schema>(
    schema: U,
    example?: SchemaOutput<U>,
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, U, TErrorMap> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .output(schema, example),
    })
  }

  errors<UErrorMap extends ErrorMap>(
    errors: UErrorMap,
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema, UErrorMap> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .errors(errors),
    })
  }

  use<U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      U,
      SchemaOutput<TInputSchema>,
      SchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>
    >,
  ): ProcedureImplementer<
    TContext,
    MergeContext<TExtraContext, U>,
    TInputSchema,
    TOutputSchema,
    TErrorMap
  >

  use<
    UExtra extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined,
    UInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtra,
      UInput,
      SchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UInput>,
  ): ProcedureImplementer<
    TContext,
    MergeContext<TExtraContext, UExtra>,
    TInputSchema,
    TOutputSchema,
    TErrorMap
  >

  use(
    middleware: Middleware<any, any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): ProcedureImplementer<any, any, any, any, any> {
    if (!mapInput) {
      return new ProcedureImplementer({
        contract: this['~orpc'].contract,
        preMiddlewares: this['~orpc'].middlewares,
        postMiddlewares: [],
      }).use(middleware)
    }

    return new ProcedureImplementer({
      contract: this['~orpc'].contract,
      preMiddlewares: this['~orpc'].middlewares,
      postMiddlewares: [],
    }).use(middleware, mapInput)
  }

  handler<UFuncOutput extends SchemaInput<TOutputSchema>>(
    handler: ProcedureHandler<TContext, TExtraContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap>,
  ): DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap> {
    return new DecoratedProcedure({
      preMiddlewares: this['~orpc'].middlewares,
      postMiddlewares: [],
      contract: this['~orpc'].contract,
      handler,
    })
  }
}
