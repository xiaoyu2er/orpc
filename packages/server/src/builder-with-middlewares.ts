import type { ContractProcedureDef, ContractRouter, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, HTTPPath, MergedErrorMap, Meta, Route, Schema, StrictErrorMap } from '@orpc/contract'
import type { Context, TypeCurrentContext, TypeInitialContext } from './context'
import type { ConflictContextGuard, MergedContext } from './context-utils'
import type { ORPCErrorConstructorMap } from './error'
import type { FlattenLazy } from './lazy-utils'
import type { AnyMiddleware, Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import type { AdaptedRouter } from './router-utils'
import { mergeErrorMap, mergeMeta, mergeRoute } from '@orpc/contract'
import { lazy } from './lazy'
import { flatLazy } from './lazy-utils'
import { addMiddleware } from './middleware-utils'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'
import { adaptRouter } from './router-utils'

/**
 * `BuilderWithMiddlewares` is a branch of `Builder` which it has middlewares.
 *
 * Why?
 * - prevents .middleware after .use (can mislead the behavior)
 * - prevents .context after .use (middlewares required current context, so it tricky when change the current context)
 *
 */
export interface BuilderWithMiddlewaresDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> extends ContractProcedureDef<undefined, undefined, TErrorMap, Route, TMetaDef, TMetaDef> {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  middlewares: AnyMiddleware[]
  inputValidationIndex: number
  outputValidationIndex: number
}

export class BuilderWithMiddlewares<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> {
  '~orpc': BuilderWithMiddlewaresDef<TInitialContext, TCurrentContext, TErrorMap, TMetaDef>

  constructor(def: BuilderWithMiddlewaresDef<TInitialContext, TCurrentContext, TErrorMap, TMetaDef>) {
    this['~orpc'] = def
  }

  use<U extends Context>(
    middleware: Middleware<TCurrentContext, U, unknown, unknown, ORPCErrorConstructorMap<TErrorMap>, TMetaDef>,
  ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
    & BuilderWithMiddlewares<TInitialContext, MergedContext<TCurrentContext, U>, TErrorMap, TMetaDef> {
    const builder = new BuilderWithMiddlewares<TInitialContext, MergedContext<TCurrentContext, U>, TErrorMap, TMetaDef>({
      errorMap: this['~orpc'].errorMap,
      inputSchema: this['~orpc'].inputSchema,
      outputSchema: this['~orpc'].outputSchema,
      meta: this['~orpc'].meta,
      route: this['~orpc'].route,
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
      middlewares: addMiddleware(this['~orpc'].middlewares, middleware),
    })

    return builder as typeof builder & ConflictContextGuard<MergedContext<TCurrentContext, U>>
  }

  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): BuilderWithMiddlewares<TInitialContext, TCurrentContext, MergedErrorMap<TErrorMap, StrictErrorMap<U>>, TMetaDef> {
    return new BuilderWithMiddlewares({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(meta: TMetaDef): ProcedureBuilder<TInitialContext, TCurrentContext, TErrorMap, TMetaDef> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      middlewares: [],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(route: Route): ProcedureBuilder<TInitialContext, TCurrentContext, TErrorMap, TMetaDef> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, USchema, TErrorMap, TMetaDef> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      inputSchema: schema,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, USchema, TErrorMap, TMetaDef> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      outputSchema: schema,
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, undefined, undefined, UFuncOutput, TErrorMap, TMetaDef>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, undefined, undefined, UFuncOutput, TErrorMap, Route, TMetaDef, TMetaDef> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMetaDef> {
    return new RouterBuilder({
      middlewares: this['~orpc'].middlewares,
      errorMap: this['~orpc'].errorMap,
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMetaDef> {
    return new RouterBuilder({
      middlewares: this['~orpc'].middlewares,
      errorMap: this['~orpc'].errorMap,
      tags,
    })
  }

  router<U extends Router<TInitialContext, ContractRouter<ErrorMap & Partial<TErrorMap>, TMetaDef>>>(
    router: U,
  ): AdaptedRouter<U, TInitialContext, TErrorMap> {
    return adaptRouter(router, this['~orpc'])
  }

  lazy<U extends Router<TInitialContext, ContractRouter<ErrorMap & Partial<TErrorMap>, TMetaDef>>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<FlattenLazy<U>, TInitialContext, TErrorMap> {
    return adaptRouter(flatLazy(lazy(loader)), this['~orpc'])
  }
}
