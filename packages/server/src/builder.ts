import type { ContractProcedureDef, ContractRouter, ErrorMap, HTTPPath, MergedErrorMap, Meta, ORPCErrorConstructorMap, Route, Schema } from '@orpc/contract'
import type { BuilderWithMiddlewares } from './builder-variants'
import type { ConflictContextGuard, Context, MergedContext, TypeCurrentContext, TypeInitialContext } from './context'
import type { FlattenLazy } from './lazy-utils'
import type { AnyMiddleware, Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ProcedureHandler } from './procedure'
import type { ProcedureBuilderWithoutInputMethods, ProcedureBuilderWithoutOutputMethods } from './procedure-builder-variants'
import { mergeErrorMap, mergeMeta, mergeRoute } from '@orpc/contract'
import { fallbackConfig } from './config'
import { lazy } from './lazy'
import { flatLazy } from './lazy-utils'
import { decorateMiddleware } from './middleware-decorated'
import { addMiddleware } from './middleware-utils'
import { ProcedureBuilder } from './procedure-builder'
import { DecoratedProcedure } from './procedure-decorated'
import { type AdaptedRouter, adaptRouter, type Router } from './router'
import { RouterBuilder } from './router-builder'

export interface BuilderConfig {
  initialInputValidationIndex?: number
  initialOutputValidationIndex?: number
}

export interface BuilderDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedureDef<undefined, undefined, TErrorMap, TMeta> {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  middlewares: AnyMiddleware[]
  inputValidationIndex: number
  outputValidationIndex: number
}

export class Builder<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  constructor(def: BuilderDef<TInitialContext, TCurrentContext, TErrorMap, TMeta>) {
    this['~orpc'] = def
  }

  /**
   * Reset config
   */
  $config(config: BuilderConfig): Builder<TInitialContext, TCurrentContext, TErrorMap, TMeta> {
    const middlewaresLength = this['~orpc'].middlewares.length

    return new Builder({
      ...this['~orpc'],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', config.initialInputValidationIndex) + middlewaresLength,
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', config.initialOutputValidationIndex) + middlewaresLength,
    })
  }

  /**
   * Reset initial context
   */
  $context<U extends Context>(): Builder<U, U, TErrorMap, TMeta> {
    const middlewaresLength = this['~orpc'].middlewares.length

    const builder = new Builder({
      ...this['~orpc'],
      middlewares: [],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex') - middlewaresLength,
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex') - middlewaresLength,
    })

    return builder as any // since this change the InitialContext so we need to cast here to make type checker happy
  }

  /**
   * Reset initial meta
   */
  $meta<U extends Meta>(
    initialMeta: U,
  ): Builder<TInitialContext, TCurrentContext, TErrorMap, U> {
    return new Builder({
      ...this['~orpc'],
      meta: initialMeta,
    })
  }

  /**
   * Reset initial route
   */
  $route(
    initialRoute: Route,
  ): Builder<TInitialContext, TCurrentContext, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      route: initialRoute,
    })
  }

  middleware<UOutContext extends Context, TInput, TOutput = any>( // = any here is important to make middleware can be used in any output by default
    middleware: Middleware<TInitialContext, UOutContext, TInput, TOutput, ORPCErrorConstructorMap<TErrorMap>, TMeta>,
  ): DecoratedMiddleware<TInitialContext, UOutContext, TInput, TOutput, ORPCErrorConstructorMap<any>, TMeta> {
    return decorateMiddleware(middleware)
  }

  errors<U extends ErrorMap>(
    errors: U,
  ): Builder<TInitialContext, TCurrentContext, MergedErrorMap<TErrorMap, U>, TMeta > {
    return new Builder({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  use<UOutContext extends Context>(
    middleware: Middleware<TCurrentContext, UOutContext, unknown, unknown, ORPCErrorConstructorMap<TErrorMap>, TMeta>,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>>
    & BuilderWithMiddlewares<TInitialContext, MergedContext<TCurrentContext, UOutContext>, TErrorMap, TMeta> {
    const builder = new Builder({
      ...this['~orpc'],
      middlewares: addMiddleware(this['~orpc'].middlewares, middleware),
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
    })

    return builder as any // since this change the CurrentContext so we need to cast here to make type checker happy
  }

  meta(meta: TMeta): ProcedureBuilder<TInitialContext, TCurrentContext, undefined, undefined, TErrorMap, TMeta> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(route: Route): ProcedureBuilder<TInitialContext, TCurrentContext, undefined, undefined, TErrorMap, TMeta> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithoutInputMethods<TInitialContext, TCurrentContext, USchema, undefined, TErrorMap, TMeta> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithoutOutputMethods<TInitialContext, TCurrentContext, undefined, USchema, TErrorMap, TMeta> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, undefined, undefined, UFuncOutput, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, undefined, undefined, UFuncOutput, TErrorMap, TMeta> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta> {
    return new RouterBuilder({
      ...this['~orpc'],
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta> {
    return new RouterBuilder({
      ...this['~orpc'],
      tags,
    })
  }

  router<U extends Router<TCurrentContext, ContractRouter<TMeta>>>(router: U): AdaptedRouter<U, TInitialContext, TErrorMap> {
    return adaptRouter(router, this['~orpc'])
  }

  lazy<U extends Router<TCurrentContext, ContractRouter<TMeta>>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<FlattenLazy<U>, TInitialContext, TErrorMap> {
    return adaptRouter(flatLazy(lazy(loader)), this['~orpc'])
  }
}

export const os = new Builder({
  route: {},
  meta: {},
  errorMap: {},
  inputSchema: undefined,
  outputSchema: undefined,
  inputValidationIndex: fallbackConfig('initialInputValidationIndex'),
  outputValidationIndex: fallbackConfig('initialOutputValidationIndex'),
  middlewares: [],
})
