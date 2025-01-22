import type { ContractProcedureDef, ContractRouter, ErrorMap, ErrorMapSuggestions, HTTPPath, Meta, Route, Schema, StrictErrorMap } from '@orpc/contract'
import type { Context, TypeInitialContext } from './context'
import type { ConflictContextGuard, MergedContext } from './context-utils'
import type { FlattenLazy } from './lazy-utils'
import type { Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import type { AccessibleLazyRouter } from './router-accessible-lazy'
import { createStrictErrorMap, mergeMeta, mergeRoute } from '@orpc/contract'
import { BuilderWithErrors } from './builder-with-errors'
import { BuilderWithMiddlewares } from './builder-with-middlewares'
import { fallbackConfig } from './config'
import { lazy } from './lazy'
import { flatLazy } from './lazy-utils'
import { decorateMiddleware } from './middleware-decorated'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'
import { createAccessibleLazyRouter } from './router-accessible-lazy'
import { RouterBuilder } from './router-builder'

export interface BuilderConfig {
  initialInputValidationIndex?: number
  initialOutputValidationIndex?: number
}

export interface BuilderDef<
  TInitialContext extends Context,
  TMetaDef extends Meta,
> extends ContractProcedureDef<undefined, undefined, Record<never, never>, Route, TMetaDef, TMetaDef> {
  __initialContext?: TypeInitialContext<TInitialContext>
  inputValidationIndex: number
  outputValidationIndex: number
}

export class Builder<
  TInitialContext extends Context,
  TMetaDef extends Meta,
> {
  '~orpc': BuilderDef<TInitialContext, TMetaDef>

  constructor(def: BuilderDef<TInitialContext, TMetaDef>) {
    this['~orpc'] = def
  }

  /**
   * Reset config
   */
  $config(config: BuilderConfig): Builder<TInitialContext, TMetaDef> {
    return new Builder({
      ...this['~orpc'],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', config.initialOutputValidationIndex),
    })
  }

  /**
   * Reset initial context
   */
  $context<U extends Context>(): Builder<U, TMetaDef> {
    return this as any // just change at type level so safely cast here
  }

  /**
   * Reset initial meta
   */
  $meta<U extends Meta>(
    initialMeta: U,
  ): Builder<TInitialContext, U> {
    return new Builder({
      inputValidationIndex: this['~orpc'].inputValidationIndex,
      outputValidationIndex: this['~orpc'].outputValidationIndex,
      errorMap: this['~orpc'].errorMap,
      inputSchema: this['~orpc'].inputSchema,
      outputSchema: this['~orpc'].outputSchema,
      route: this['~orpc'].route,
      meta: initialMeta,
    })
  }

  /**
   * Reset initial route
   */
  $route<const U extends Route>(
    route: U,
  ): Builder<TInitialContext, TMetaDef> {
    return new Builder({
      ...this['~orpc'],
      route,
    })
  }

  middleware<UOutContext extends Context, TInput, TOutput = any>( // = any here is important to make middleware can be used in any output by default
    middleware: Middleware<TInitialContext, UOutContext, TInput, TOutput, Record<never, never>, TMetaDef>,
  ): DecoratedMiddleware<TInitialContext, UOutContext, TInput, TOutput, Record<never, never>, TMetaDef> {
    return decorateMiddleware(middleware)
  }

  errors<const U extends ErrorMap & ErrorMapSuggestions>(errors: U): BuilderWithErrors<TInitialContext, StrictErrorMap<U>, TMetaDef> {
    return new BuilderWithErrors({
      ...this['~orpc'],
      errorMap: createStrictErrorMap(errors),
    })
  }

  use<UOutContext extends Context>(
    middleware: Middleware<TInitialContext, UOutContext, unknown, unknown, Record<never, never>, TMetaDef>,
  ): ConflictContextGuard<TInitialContext & UOutContext>
    & BuilderWithMiddlewares<TInitialContext, MergedContext<TInitialContext, UOutContext>, Record<never, never>, TMetaDef> {
    const builder = new BuilderWithMiddlewares<TInitialContext, MergedContext<TInitialContext, UOutContext>, Record<never, never>, TMetaDef>({
      ...this['~orpc'],
      middlewares: [middleware],
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
    })

    return builder as typeof builder & ConflictContextGuard<TInitialContext & UOutContext>
  }

  meta(meta: TMetaDef): ProcedureBuilder<TInitialContext, TInitialContext, Record<never, never>, TMetaDef> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      middlewares: [],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(route: Route): ProcedureBuilder<TInitialContext, TInitialContext, Record<never, never>, TMetaDef> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      middlewares: [],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithInput<TInitialContext, TInitialContext, USchema, Record<never, never>, TMetaDef> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      middlewares: [],
      inputSchema: schema,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithOutput<TInitialContext, TInitialContext, USchema, Record<never, never>, TMetaDef> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      middlewares: [],
      outputSchema: schema,
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TInitialContext, undefined, undefined, UFuncOutput, Record<never, never>, TMetaDef>,
  ): DecoratedProcedure<TInitialContext, TInitialContext, undefined, undefined, UFuncOutput, Record<never, never>, Route, TMetaDef, TMetaDef> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      middlewares: [],
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TInitialContext, TInitialContext, Record<never, never>, TMetaDef> {
    return new RouterBuilder({
      middlewares: [],
      errorMap: {},
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TInitialContext, Record<never, never>, TMetaDef> {
    return new RouterBuilder({
      middlewares: [],
      errorMap: {},
      tags,
    })
  }

  router<U extends Router<TInitialContext, ContractRouter<any, TMetaDef>>>(router: U): U {
    return router
  }

  lazy<U extends Router<TInitialContext, ContractRouter<any, TMetaDef>>>(
    loader: () => Promise<{ default: U }>,
  ): AccessibleLazyRouter<FlattenLazy<U>> {
    return createAccessibleLazyRouter(flatLazy(lazy(loader)))
  }
}
