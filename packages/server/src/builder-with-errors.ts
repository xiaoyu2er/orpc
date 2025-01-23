import type { ContractProcedureDef, ContractRouter, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, HTTPPath, MergedErrorMap, Meta, Route, Schema, StrictErrorMap } from '@orpc/contract'
import type { Context, TypeInitialContext } from './context'
import type { ConflictContextGuard, MergedContext } from './context-utils'
import type { ORPCErrorConstructorMap } from './error'
import type { FlattenLazy } from './lazy-utils'
import type { Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import type { AdaptedRouter } from './router-utils'
import { mergeErrorMap, mergeMeta, mergeRoute } from '@orpc/contract'
import { BuilderWithMiddlewares } from './builder-with-middlewares'
import { lazy } from './lazy'
import { flatLazy } from './lazy-utils'
import { decorateMiddleware } from './middleware-decorated'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'
import { adaptRouter } from './router-utils'

export interface BuilderWithErrorsDef<
  TInitialContext extends Context,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> extends ContractProcedureDef<undefined, undefined, TErrorMap, Route, TMetaDef, TMetaDef> {
  __initialContext?: TypeInitialContext<TInitialContext>
  inputValidationIndex: number
  outputValidationIndex: number
}

/**
 * `BuilderWithErrors` is a branch of `Builder` which it has error map.
 *
 * Why?
 * - prevents .contract after .errors (add error map to existing contract can make the contract invalid)
 *
 */
export class BuilderWithErrors<
  TInitialContext extends Context,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> {
  '~orpc': BuilderWithErrorsDef<TInitialContext, TErrorMap, TMetaDef>

  constructor(def: BuilderWithErrorsDef<TInitialContext, TErrorMap, TMetaDef>) {
    this['~orpc'] = def
  }

  middleware<UOutContext extends Context, TInput, TOutput = any>( // = any here is important to make middleware can be used in any output by default
    middleware: Middleware<TInitialContext, UOutContext, TInput, TOutput, ORPCErrorConstructorMap<TErrorMap>, TMetaDef>,
  ): DecoratedMiddleware<TInitialContext, UOutContext, TInput, TOutput, ORPCErrorConstructorMap<TErrorMap>, TMetaDef> {
    return decorateMiddleware(middleware)
  }

  errors<const U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): BuilderWithErrors<TInitialContext, MergedErrorMap<TErrorMap, StrictErrorMap<U>>, TMetaDef> {
    return new BuilderWithErrors({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  use<U extends Context>(
    middleware: Middleware<TInitialContext, U, unknown, unknown, ORPCErrorConstructorMap<TErrorMap>, TMetaDef>,
  ): ConflictContextGuard<MergedContext<TInitialContext, U>>
    & BuilderWithMiddlewares<TInitialContext, MergedContext< TInitialContext, U>, TErrorMap, TMetaDef> {
    const builder = new BuilderWithMiddlewares<TInitialContext, MergedContext<TInitialContext, U>, TErrorMap, TMetaDef>({
      ...this['~orpc'],
      middlewares: [middleware],
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
    })

    return builder as typeof builder & ConflictContextGuard<MergedContext<TInitialContext, U>>
  }

  meta(meta: TMetaDef): ProcedureBuilder<TInitialContext, TInitialContext, TErrorMap, TMetaDef> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      middlewares: [],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(route: Route): ProcedureBuilder<TInitialContext, TInitialContext, TErrorMap, TMetaDef> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      middlewares: [],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithInput<TInitialContext, TInitialContext, USchema, TErrorMap, TMetaDef> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      middlewares: [],
      inputSchema: schema,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithOutput<TInitialContext, TInitialContext, USchema, TErrorMap, TMetaDef> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      middlewares: [],
      outputSchema: schema,
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TInitialContext, undefined, undefined, UFuncOutput, TErrorMap, TMetaDef>,
  ): DecoratedProcedure<TInitialContext, TInitialContext, undefined, undefined, UFuncOutput, TErrorMap, TMetaDef> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      middlewares: [],
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TInitialContext, TInitialContext, TErrorMap, TMetaDef> {
    return new RouterBuilder({
      middlewares: [],
      errorMap: this['~orpc'].errorMap,
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TInitialContext, TErrorMap, TMetaDef> {
    return new RouterBuilder({
      middlewares: [],
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
