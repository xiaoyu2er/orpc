import type { ContractBuilderConfig, ContractRouter, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, HTTPPath, Route, Schema, SchemaInput, SchemaOutput, StrictErrorMap } from '@orpc/contract'
import type { BuilderConfig } from './builder'
import type { Context, TypeInitialContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { FlattenLazy } from './lazy'
import type { Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import type { AdaptedRouter } from './router-builder'
import { ContractProcedure, fallbackContractConfig } from '@orpc/contract'
import { BuilderWithErrorsMiddlewares } from './builder-with-errors-middlewares'
import { fallbackConfig } from './config'
import { decorateMiddleware } from './middleware-decorated'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'

export interface BuilderWithErrorsDef<TInitialContext extends Context, TErrorMap extends ErrorMap> {
  __initialContext?: TypeInitialContext<TInitialContext>
  errorMap: TErrorMap
  config: BuilderConfig
}

/**
 * `BuilderWithErrors` is a branch of `Builder` which it has error map.
 *
 * Why?
 * - prevents .contract after .errors (add error map to existing contract can make the contract invalid)
 *
 */
export class BuilderWithErrors<TInitialContext extends Context, TErrorMap extends ErrorMap> {
  '~type' = 'BuilderWithErrors' as const
  '~orpc': BuilderWithErrorsDef<TInitialContext, TErrorMap>

  constructor(def: BuilderWithErrorsDef<TInitialContext, TErrorMap>) {
    this['~orpc'] = def
  }

  config(config: ContractBuilderConfig): BuilderWithErrors<TInitialContext, TErrorMap> {
    return new BuilderWithErrors({
      ...this['~orpc'],
      config: {
        ...this['~orpc'].config,
        ...config,
      },
    })
  }

  context<UContext extends Context & TInitialContext = TInitialContext>(): BuilderWithErrors<UContext, TErrorMap> {
    return this as any // just change at type level so safely cast here
  }

  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): BuilderWithErrors<TInitialContext, StrictErrorMap<U> & TErrorMap> {
    return new BuilderWithErrors({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  middleware<UOutContext extends Context, TInput, TOutput = any>(
    middleware: Middleware<TInitialContext, UOutContext, TInput, TOutput, ORPCErrorConstructorMap<TErrorMap>>,
  ): DecoratedMiddleware<TInitialContext, UOutContext, TInput, TOutput, ORPCErrorConstructorMap<TErrorMap>> {
    return decorateMiddleware(middleware)
  }

  use<U extends Context>(
    middleware: Middleware<TInitialContext, U, unknown, unknown, ORPCErrorConstructorMap<TErrorMap>>,
  ): BuilderWithErrorsMiddlewares<TInitialContext, TInitialContext & U, TErrorMap> {
    return new BuilderWithErrorsMiddlewares<TInitialContext, TInitialContext & U, TErrorMap>({
      ...this['~orpc'],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex) + 1,
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex) + 1,
      middlewares: [middleware],
    })
  }

  route(route: Route): ProcedureBuilder<TInitialContext, TInitialContext, TErrorMap> {
    return new ProcedureBuilder({
      middlewares: [],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex),
      contract: new ContractProcedure({
        route: {
          ...fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
          ...route,
        },
        InputSchema: undefined,
        OutputSchema: undefined,
        errorMap: this['~orpc'].errorMap,
      }),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaInput<USchema>,
  ): ProcedureBuilderWithInput<TInitialContext, TInitialContext, USchema, TErrorMap> {
    return new ProcedureBuilderWithInput({
      middlewares: [],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex),
      contract: new ContractProcedure({
        route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
        OutputSchema: undefined,
        InputSchema: schema,
        inputExample: example,
        errorMap: this['~orpc'].errorMap,
      }),
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
  ): ProcedureBuilderWithOutput<TInitialContext, TInitialContext, USchema, TErrorMap> {
    return new ProcedureBuilderWithOutput({
      middlewares: [],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex),
      contract: new ContractProcedure({
        route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
        InputSchema: undefined,
        OutputSchema: schema,
        outputExample: example,
        errorMap: this['~orpc'].errorMap,
      }),
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TInitialContext, undefined, undefined, UFuncOutput, TErrorMap>,
  ): DecoratedProcedure<TInitialContext, TInitialContext, undefined, undefined, UFuncOutput, TErrorMap, Route> {
    return new DecoratedProcedure({
      middlewares: [],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex),
      contract: new ContractProcedure({
        route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
        InputSchema: undefined,
        OutputSchema: undefined,
        errorMap: this['~orpc'].errorMap,
      }),
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TInitialContext, TInitialContext, TErrorMap> {
    return new RouterBuilder({
      middlewares: [],
      errorMap: this['~orpc'].errorMap,
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TInitialContext, TErrorMap> {
    return new RouterBuilder({
      middlewares: [],
      errorMap: this['~orpc'].errorMap,
      tags,
    })
  }

  router<U extends Router<TInitialContext, ContractRouter<ErrorMap & Partial<TErrorMap>>>>(
    router: U,
  ): AdaptedRouter<TInitialContext, U, TErrorMap> {
    return new RouterBuilder<TInitialContext, TInitialContext, TErrorMap>({
      middlewares: [],
      ...this['~orpc'],
    }).router(router)
  }

  lazy<U extends Router<TInitialContext, ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<TInitialContext, FlattenLazy<U>, TErrorMap> {
    return new RouterBuilder<TInitialContext, TInitialContext, TErrorMap>({
      middlewares: [],
      ...this['~orpc'],
    }).lazy(loader)
  }
}
