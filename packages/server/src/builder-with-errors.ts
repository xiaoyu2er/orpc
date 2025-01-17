import type { ContractBuilderConfig, ContractRouter, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, HTTPPath, RouteOptions, Schema, SchemaInput, SchemaOutput, StrictErrorMap } from '@orpc/contract'
import type { ContextGuard } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { FlattenLazy } from './lazy'
import type { Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import type { AdaptedRouter } from './router-builder'
import type { Context, MergeContext } from './types'
import { ContractProcedure } from '@orpc/contract'
import { BuilderWithErrorsMiddlewares } from './builder-with-errors-middlewares'
import { decorateMiddleware } from './middleware-decorated'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'

export interface BuilderWithErrorsDef<TContext extends Context, TErrorMap extends ErrorMap> {
  types?: { context: TContext }
  errorMap: TErrorMap
  config: ContractBuilderConfig
}

/**
 * `BuilderWithErrors` is a branch of `Builder` which it has error map.
 *
 * Why?
 * - prevents .contract after .errors (add error map to existing contract can make the contract invalid)
 *
 */
export class BuilderWithErrors<TContext extends Context, TErrorMap extends ErrorMap> {
  '~type' = 'BuilderWithErrors' as const
  '~orpc': BuilderWithErrorsDef<TContext, TErrorMap>

  constructor(def: BuilderWithErrorsDef<TContext, TErrorMap>) {
    this['~orpc'] = def
  }

  context<UContext extends Context = TContext>(): BuilderWithErrors<UContext, TErrorMap> {
    return this as any // just change at type level so safely cast here
  }

  config(config: ContractBuilderConfig): BuilderWithErrors<TContext, TErrorMap> {
    return new BuilderWithErrors({
      ...this['~orpc'],
      config,
    })
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(errors: U): BuilderWithErrors<TContext, TErrorMap & U> {
    return new BuilderWithErrors({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  middleware<UExtraContext extends Context & ContextGuard<TContext>, TInput, TOutput = any>(
    middleware: Middleware<TContext, UExtraContext, TInput, TOutput, ORPCErrorConstructorMap<TErrorMap>>,
  ): DecoratedMiddleware<TContext, UExtraContext, TInput, TOutput, ORPCErrorConstructorMap<TErrorMap>> {
    return decorateMiddleware(middleware)
  }

  use<U extends Context & ContextGuard<TContext>>(
    middleware: Middleware<TContext, U, unknown, unknown, ORPCErrorConstructorMap<TErrorMap>>,
  ): BuilderWithErrorsMiddlewares<TContext, U, TErrorMap> {
    return new BuilderWithErrorsMiddlewares<TContext, U, TErrorMap>({
      ...this['~orpc'],
      inputValidationIndex: 1,
      outputValidationIndex: 1,
      middlewares: [middleware as any], // FIXME: I believe we can remove `as any` here
    })
  }

  route(route: RouteOptions): ProcedureBuilder<TContext, undefined, TErrorMap> {
    return new ProcedureBuilder({
      middlewares: [],
      inputValidationIndex: 0,
      outputValidationIndex: 0,
      contract: new ContractProcedure({
        route: {
          ...this['~orpc'].config.initialRoute,
          ...route,
        },
        InputSchema: undefined,
        OutputSchema: undefined,
        errorMap: this['~orpc'].errorMap,
      }),
    })
  }

  input<USchema extends Schema>(schema: USchema, example?: SchemaInput<USchema>): ProcedureBuilderWithInput<TContext, undefined, USchema, TErrorMap> {
    return new ProcedureBuilderWithInput({
      middlewares: [],
      inputValidationIndex: 0,
      outputValidationIndex: 0,
      contract: new ContractProcedure({
        route: this['~orpc'].config.initialRoute,
        OutputSchema: undefined,
        InputSchema: schema,
        inputExample: example,
        errorMap: this['~orpc'].errorMap,
      }),
    })
  }

  output<USchema extends Schema>(schema: USchema, example?: SchemaOutput<USchema>): ProcedureBuilderWithOutput<TContext, undefined, USchema, TErrorMap> {
    return new ProcedureBuilderWithOutput({
      middlewares: [],
      inputValidationIndex: 0,
      outputValidationIndex: 0,
      contract: new ContractProcedure({
        route: this['~orpc'].config.initialRoute,
        InputSchema: undefined,
        OutputSchema: schema,
        outputExample: example,
        errorMap: this['~orpc'].errorMap,
      }),
    })
  }

  handler<UFuncOutput>(handler: ProcedureHandler<TContext, undefined, undefined, undefined, UFuncOutput, TErrorMap>): DecoratedProcedure<TContext, undefined, undefined, undefined, UFuncOutput, TErrorMap> {
    return new DecoratedProcedure({
      middlewares: [],
      inputValidationIndex: 0,
      outputValidationIndex: 0,
      contract: new ContractProcedure({
        route: this['~orpc'].config.initialRoute,
        InputSchema: undefined,
        OutputSchema: undefined,
        errorMap: this['~orpc'].errorMap,
      }),
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TContext, undefined, TErrorMap> {
    return new RouterBuilder({
      middlewares: [],
      errorMap: this['~orpc'].errorMap,
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TContext, undefined, TErrorMap> {
    return new RouterBuilder({
      middlewares: [],
      errorMap: this['~orpc'].errorMap,
      tags,
    })
  }

  router<U extends Router<MergeContext<TContext, undefined>, ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>>(
    router: U,
  ): AdaptedRouter<TContext, U, TErrorMap> {
    return new RouterBuilder<TContext, undefined, TErrorMap>({
      middlewares: [],
      ...this['~orpc'],
    }).router(router)
  }

  lazy<U extends Router<MergeContext<TContext, undefined>, ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<TContext, FlattenLazy<U>, TErrorMap> {
    return new RouterBuilder<TContext, undefined, TErrorMap>({
      middlewares: [],
      ...this['~orpc'],
    }).lazy(loader)
  }
}
