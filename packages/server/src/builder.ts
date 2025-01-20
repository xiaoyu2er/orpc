import type { ContractBuilderConfig, ContractRouter, ErrorMap, ErrorMapSuggestions, HTTPPath, Route, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ConflictContextGuard, Context, TypeInitialContext } from './context'
import type { DecoratedLazy } from './lazy-decorated'
import type { Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import { ContractProcedure, fallbackContractConfig } from '@orpc/contract'
import { BuilderWithErrors } from './builder-with-errors'
import { BuilderWithMiddlewares } from './builder-with-middlewares'
import { fallbackConfig } from './config'
import { type ChainableImplementer, createChainableImplementer } from './implementer-chainable'
import { flatLazy, type FlattenLazy, lazy } from './lazy'
import { decorateLazy } from './lazy-decorated'
import { decorateMiddleware } from './middleware-decorated'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'

export interface BuilderConfig extends ContractBuilderConfig {
  initialInputValidationIndex?: number
  initialOutputValidationIndex?: number
}

export interface BuilderDef<TInitialContext extends Context> {
  __initialContext?: TypeInitialContext<TInitialContext>
  config: BuilderConfig
}

export class Builder<TInitialContext extends Context> {
  '~type' = 'Builder' as const
  '~orpc': BuilderDef<TInitialContext>

  constructor(def: BuilderDef<TInitialContext>) {
    this['~orpc'] = def
  }

  config(config: ContractBuilderConfig): Builder<TInitialContext> {
    return new Builder({
      ...this['~orpc'],
      config: {
        ...this['~orpc'].config,
        ...config,
      },
    })
  }

  context<UContext extends Context & TInitialContext = TInitialContext>(): Builder<UContext> {
    return this as any // just change at type level so safely cast here
  }

  middleware<UOutContext extends Context, TInput, TOutput = any >(
    middleware: Middleware<TInitialContext, UOutContext, TInput, TOutput, Record<never, never>>,
  ): DecoratedMiddleware<TInitialContext, UOutContext, TInput, TOutput, Record<never, never>> {
    return decorateMiddleware(middleware)
  }

  errors<U extends ErrorMap & ErrorMapSuggestions>(errors: U): BuilderWithErrors<TInitialContext, U> {
    return new BuilderWithErrors({
      ...this['~orpc'],
      errorMap: errors,
    })
  }

  use<UOutContext extends Context>(
    middleware: Middleware<TInitialContext, UOutContext, unknown, unknown, Record<never, never>>,
  ): ConflictContextGuard<TInitialContext & UOutContext>
    & BuilderWithMiddlewares<TInitialContext, TInitialContext & UOutContext> {
    const builder = new BuilderWithMiddlewares<TInitialContext, TInitialContext & UOutContext>({
      ...this['~orpc'],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex) + 1,
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex) + 1,
      middlewares: [middleware as any], // FIXME: I believe we can remove `as any` here
    })

    return builder as typeof builder & ConflictContextGuard<TInitialContext & UOutContext>
  }

  route(route: Route): ProcedureBuilder<TInitialContext, TInitialContext, Record<never, never>> {
    return new ProcedureBuilder({
      middlewares: [],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex),
      contract: new ContractProcedure({
        route: {
          ...this['~orpc'].config.initialRoute,
          ...route,
        },
        InputSchema: undefined,
        OutputSchema: undefined,
        errorMap: {},
      }),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaInput<USchema>,
  ): ProcedureBuilderWithInput<TInitialContext, TInitialContext, USchema, Record<never, never>> {
    return new ProcedureBuilderWithInput({
      middlewares: [],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex),
      contract: new ContractProcedure({
        route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
        OutputSchema: undefined,
        InputSchema: schema,
        inputExample: example,
        errorMap: {},
      }),
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
  ): ProcedureBuilderWithOutput<TInitialContext, TInitialContext, USchema, Record<never, never>> {
    return new ProcedureBuilderWithOutput({
      middlewares: [],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex),
      contract: new ContractProcedure({
        route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
        InputSchema: undefined,
        OutputSchema: schema,
        outputExample: example,
        errorMap: {},
      }),
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TInitialContext, undefined, undefined, UFuncOutput, Record<never, never>>,
  ): DecoratedProcedure<TInitialContext, TInitialContext, undefined, undefined, UFuncOutput, Record<never, never>, Route> {
    return new DecoratedProcedure({
      middlewares: [],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex),
      contract: new ContractProcedure({
        route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
        InputSchema: undefined,
        OutputSchema: undefined,
        errorMap: {},
      }),
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TInitialContext, TInitialContext, Record<never, never>> {
    return new RouterBuilder({
      middlewares: [],
      errorMap: {},
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TInitialContext, Record<never, never>> {
    return new RouterBuilder({
      middlewares: [],
      errorMap: {},
      tags,
    })
  }

  router<U extends Router<TInitialContext, any>>(router: U): U {
    return router
  }

  lazy<U extends Router<TInitialContext, any>>(
    loader: () => Promise<{ default: U }>,
  ): DecoratedLazy<FlattenLazy<U>> {
    return decorateLazy(flatLazy(lazy(loader)))
  }

  contract<U extends ContractRouter<any>>(
    contract: U,
  ): ChainableImplementer<TInitialContext, TInitialContext, U> {
    return createChainableImplementer(contract, {
      middlewares: [],
      inputValidationIndex: 0,
      outputValidationIndex: 0,
    })
  }
}
