import type { ContractProcedure, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, RouteOptions, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ConflictContextGuard, Context, TypeCurrentContext, TypeInitialContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import { ContractProcedureBuilder, DecoratedContractProcedure } from '@orpc/contract'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'

export interface ProcedureBuilderDef<TInitialContext extends Context, TCurrentContext extends Context, TErrorMap extends ErrorMap> {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  contract: ContractProcedure<undefined, undefined, TErrorMap>
  middlewares: Middleware<any, any, any, any, any>[]
  inputValidationIndex: number
  outputValidationIndex: number
}

export class ProcedureBuilder<TInitialContext extends Context, TCurrentContext extends Context, TErrorMap extends ErrorMap> {
  '~type' = 'ProcedureBuilder' as const
  '~orpc': ProcedureBuilderDef<TInitialContext, TCurrentContext, TErrorMap>

  constructor(def: ProcedureBuilderDef<TInitialContext, TCurrentContext, TErrorMap>) {
    this['~orpc'] = def
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TErrorMap & U> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .errors(errors),
    })
  }

  route(route: RouteOptions): ProcedureBuilder<TInitialContext, TCurrentContext, TErrorMap> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: DecoratedContractProcedure
        .decorate(this['~orpc'].contract)
        .route(route),
    })
  }

  use<U extends Context>(
    middleware: Middleware<
      TCurrentContext,
      U,
      unknown,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>
    >,
  ): ConflictContextGuard<TCurrentContext & U>
    & ProcedureBuilder<TInitialContext, TCurrentContext & U, TErrorMap> {
    const builder = new ProcedureBuilder<TInitialContext, TCurrentContext & U, TErrorMap>({
      contract: this['~orpc'].contract,
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
      middlewares: [...this['~orpc'].middlewares, middleware as any],
    })

    return builder as typeof builder & ConflictContextGuard<TCurrentContext & U>
  }

  input<U extends Schema>(schema: U, example?: SchemaInput<U>): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, U, TErrorMap> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      contract: new ContractProcedureBuilder(this['~orpc'].contract['~orpc']).input(schema, example),
    })
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, U, TErrorMap> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      contract: new ContractProcedureBuilder(this['~orpc'].contract['~orpc']).output(schema, example),
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, undefined, undefined, UFuncOutput, TErrorMap>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, undefined, undefined, UFuncOutput, TErrorMap> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }
}
