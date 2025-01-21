import type { ContractBuilderConfig, ContractRouter, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, HTTPPath, Route, Schema, SchemaInput, SchemaOutput, StrictErrorMap } from '@orpc/contract'
import type { ConflictContextGuard, Context, TypeCurrentContext, TypeInitialContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { FlattenLazy } from './lazy'
import type { Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import type { AdaptedRouter } from './router-builder'
import { ContractProcedure, fallbackContractConfig } from '@orpc/contract'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'

export interface BuilderWithErrorsMiddlewaresDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
> {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  errorMap: TErrorMap
  middlewares: Middleware<any, any, any, any, any>[]
  inputValidationIndex: number
  outputValidationIndex: number
  config: ContractBuilderConfig
}

/**
 * `BuilderWithErrorsMiddlewares` is a combination of `BuilderWithErrorsMiddlewares` and `BuilderWithErrors`.
 *
 * Why?
 * - prevents .middleware after .use (can mislead the behavior)
 * - prevents .contract after .errors (add error map to existing contract can make the contract invalid)
 * - prevents .context after .use (middlewares required current context, so it tricky when change the current context)
 *
 */
export class BuilderWithErrorsMiddlewares<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
> {
  '~type' = 'BuilderWithErrorsMiddlewares' as const
  '~orpc': BuilderWithErrorsMiddlewaresDef<TInitialContext, TCurrentContext, TErrorMap>

  constructor(def: BuilderWithErrorsMiddlewaresDef<TInitialContext, TCurrentContext, TErrorMap>) {
    this['~orpc'] = def
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): BuilderWithErrorsMiddlewares<TInitialContext, TCurrentContext, TErrorMap & U> {
    return new BuilderWithErrorsMiddlewares({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  use<U extends Context >(
    middleware: Middleware<TCurrentContext, U, unknown, unknown, ORPCErrorConstructorMap<TErrorMap>>,
  ): ConflictContextGuard<TCurrentContext & U>
    & BuilderWithErrorsMiddlewares<TInitialContext, TCurrentContext & U, TErrorMap> {
    const builder = new BuilderWithErrorsMiddlewares<TInitialContext, TCurrentContext & U, TErrorMap>({
      config: this['~orpc'].config,
      errorMap: this['~orpc'].errorMap,
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
      middlewares: [...this['~orpc'].middlewares, middleware],
    })

    return builder as typeof builder & ConflictContextGuard<TCurrentContext & U>
  }

  route(route: Route): ProcedureBuilder<TInitialContext, TCurrentContext, TErrorMap> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: new ContractProcedure({
        route: {
          ...this['~orpc'].config.initialRoute,
          ...route,
        },
        InputSchema: undefined,
        outputSchema: undefined,
        errorMap: this['~orpc'].errorMap,
      }),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaInput<USchema>,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, USchema, TErrorMap> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      contract: new ContractProcedure({
        route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
        outputSchema: undefined,
        InputSchema: schema,
        inputExample: example,
        errorMap: this['~orpc'].errorMap,
      }),
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, USchema, TErrorMap> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      contract: new ContractProcedure({
        route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
        InputSchema: undefined,
        outputSchema: schema,
        outputExample: example,
        errorMap: this['~orpc'].errorMap,
      }),
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, undefined, undefined, UFuncOutput, TErrorMap>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, undefined, undefined, UFuncOutput, TErrorMap, Route> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      contract: new ContractProcedure({
        route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
        InputSchema: undefined,
        outputSchema: undefined,
        errorMap: this['~orpc'].errorMap,
      }),
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap> {
    return new RouterBuilder({
      ...this['~orpc'],
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap> {
    return new RouterBuilder({
      ...this['~orpc'],
      tags,
    })
  }

  router<U extends Router<TCurrentContext, ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>>(
    router: U,
  ): AdaptedRouter<TInitialContext, U, TErrorMap> {
    return new RouterBuilder<TInitialContext, TCurrentContext, TErrorMap>(this['~orpc']).router(router)
  }

  lazy<U extends Router<TCurrentContext, ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<TInitialContext, FlattenLazy<U>, TErrorMap> {
    return new RouterBuilder<TInitialContext, TCurrentContext, TErrorMap>(this['~orpc']).lazy(loader)
  }
}
