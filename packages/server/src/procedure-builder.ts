import type { ContractProcedure, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, RouteOptions, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ContextGuard } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { Context, MergeContext } from './types'
import { ContractProcedureBuilder, DecoratedContractProcedure } from '@orpc/contract'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'

export interface ProcedureBuilderDef<TContext extends Context, TExtraContext extends Context, TErrorMap extends ErrorMap> {
  contract: ContractProcedure<undefined, undefined, TErrorMap>
  middlewares: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any, ORPCErrorConstructorMap<TErrorMap>>[]
  inputValidationIndex: number
  outputValidationIndex: number
}

export class ProcedureBuilder<TContext extends Context, TExtraContext extends Context, TErrorMap extends ErrorMap> {
  '~type' = 'ProcedureBuilder' as const
  '~orpc': ProcedureBuilderDef<TContext, TExtraContext, TErrorMap>

  constructor(def: ProcedureBuilderDef<TContext, TExtraContext, TErrorMap>) {
    this['~orpc'] = def
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ProcedureBuilder<TContext, TExtraContext, TErrorMap & U> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .errors(errors),
    })
  }

  route(route: RouteOptions): ProcedureBuilder<TContext, TExtraContext, TErrorMap> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .route(route),
    })
  }

  use<U extends Context & ContextGuard<MergeContext<TContext, TExtraContext>>>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      U,
      unknown,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>
    >,
  ): ProcedureBuilder<TContext, MergeContext<TExtraContext, U>, TErrorMap> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
      middlewares: [...this['~orpc'].middlewares, middleware as any],
    })
  }

  input<U extends Schema>(schema: U, example?: SchemaInput<U>): ProcedureBuilderWithInput<TContext, TExtraContext, U, TErrorMap> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      contract: new ContractProcedureBuilder(this['~orpc'].contract['~orpc']).input(schema, example),
    })
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): ProcedureBuilderWithOutput<TContext, TExtraContext, U, TErrorMap> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      contract: new ContractProcedureBuilder(this['~orpc'].contract['~orpc']).output(schema, example),
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TContext, TExtraContext, undefined, undefined, UFuncOutput, TErrorMap>,
  ): DecoratedProcedure<TContext, TExtraContext, undefined, undefined, UFuncOutput, TErrorMap> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }
}
