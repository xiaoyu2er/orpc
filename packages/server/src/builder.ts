import type { ContractProcedureDef, ContractRouter, ErrorMap, HTTPPath, MergedErrorMap, Meta, ORPCErrorConstructorMap, Route, Schema, SchemaInput } from '@orpc/contract'
import type { BuilderWithMiddlewares, ProcedureBuilder, ProcedureBuilderWithInput, ProcedureBuilderWithOutput, RouterBuilder } from './builder-variants'
import type { ConflictContextGuard, Context, MergedContext, TypeCurrentContext, TypeInitialContext } from './context'
import type { FlattenLazy } from './lazy-utils'
import type { AnyMiddleware, Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ProcedureHandler } from './procedure'
import type { AdaptedRouter, AdaptRouterOptions, Router } from './router'
import { mergeErrorMap, mergeMeta, mergeRoute } from '@orpc/contract'
import { fallbackConfig } from './config'
import { lazy } from './lazy'
import { flatLazy } from './lazy-utils'
import { decorateMiddleware } from './middleware-decorated'
import { addMiddleware } from './middleware-utils'
import { DecoratedProcedure } from './procedure-decorated'
import { adaptRouter } from './router'

export interface BuilderConfig {
  initialInputValidationIndex?: number
  initialOutputValidationIndex?: number
}

export interface BuilderDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>, AdaptRouterOptions<TInitialContext, TErrorMap> {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  middlewares: AnyMiddleware[]
  inputValidationIndex: number
  outputValidationIndex: number
}

export class Builder<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  constructor(def: BuilderDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>) {
    this['~orpc'] = def
  }

  /**
   * Reset config
   */
  $config(config: BuilderConfig): Builder<TInitialContext, TInitialContext, undefined, undefined, TErrorMap, TMeta> {
    return new Builder({
      errorMap: this['~orpc'].errorMap,
      meta: this['~orpc'].meta,
      route: this['~orpc'].route,
      inputSchema: undefined,
      outputSchema: undefined,
      middlewares: [],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', config.initialOutputValidationIndex),
    })
  }

  /**
   * Reset initial context
   */
  $context<U extends Context>(): Builder<U, U, undefined, undefined, TErrorMap, TMeta> {
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
  ): Builder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, U> {
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
  ): Builder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
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
  ): Builder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta > {
    return new Builder({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  use<UOutContext extends Context>(
    middleware: Middleware<TCurrentContext, UOutContext, unknown, unknown, ORPCErrorConstructorMap<TErrorMap>, TMeta>,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>>
    & BuilderWithMiddlewares<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    > {
    const builder = new Builder({
      ...this['~orpc'],
      middlewares: addMiddleware(this['~orpc'].middlewares, middleware),
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
    })

    return builder as any // since this change the CurrentContext so we need to cast here to make type checker happy
  }

  meta(
    meta: TMeta,
  ): BuilderWithMiddlewares<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, USchema, TOutputSchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TInputSchema, USchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }

  handler<UFuncOutput extends SchemaInput<TOutputSchema>>(
    handler: ProcedureHandler<TCurrentContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap, TMeta> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta> {
    return new Builder({
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
