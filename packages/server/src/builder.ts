import type { ContractProcedureDef, ContractRouter, ErrorMap, HTTPPath, Meta, Route, Schema } from '@orpc/contract'
import type { ConflictContextGuard, Context, MergedContext, TypeInitialContext } from './context'
import type { FlattenLazy } from './lazy-utils'
import type { Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import type { AccessibleLazyRouter } from './router-accessible-lazy'
import { mergeMeta, mergeRoute } from '@orpc/contract'
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
  TMeta extends Meta,
> extends ContractProcedureDef<undefined, undefined, Record<never, never>, TMeta> {
  __initialContext?: TypeInitialContext<TInitialContext>
  inputValidationIndex: number
  outputValidationIndex: number
}

export class Builder<
  TInitialContext extends Context,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInitialContext, TMeta>

  constructor(def: BuilderDef<TInitialContext, TMeta>) {
    this['~orpc'] = def
  }

  /**
   * Reset config
   */
  $config(config: BuilderConfig): Builder<TInitialContext, TMeta> {
    return new Builder({
      ...this['~orpc'],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', config.initialOutputValidationIndex),
    })
  }

  /**
   * Reset initial context
   */
  $context<U extends Context>(): Builder<U, TMeta> {
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
  $route(
    initialRoute: Route,
  ): Builder<TInitialContext, TMeta> {
    return new Builder({
      ...this['~orpc'],
      route: initialRoute,
    })
  }

  middleware<UOutContext extends Context, TInput, TOutput = any>( // = any here is important to make middleware can be used in any output by default
    middleware: Middleware<TInitialContext, UOutContext, TInput, TOutput, Record<never, never>, TMeta>,
  ): DecoratedMiddleware<TInitialContext, UOutContext, TInput, TOutput, Record<never, never>, TMeta> {
    return decorateMiddleware(middleware)
  }

  errors<U extends ErrorMap>(errors: U): BuilderWithErrors<TInitialContext, U, TMeta> {
    return new BuilderWithErrors({
      ...this['~orpc'],
      errorMap: errors,
    })
  }

  use<UOutContext extends Context>(
    middleware: Middleware<TInitialContext, UOutContext, unknown, unknown, Record<never, never>, TMeta>,
  ): ConflictContextGuard<TInitialContext & UOutContext>
    & BuilderWithMiddlewares<TInitialContext, MergedContext<TInitialContext, UOutContext>, Record<never, never>, TMeta> {
    const builder = new BuilderWithMiddlewares<TInitialContext, MergedContext<TInitialContext, UOutContext>, Record<never, never>, TMeta>({
      ...this['~orpc'],
      middlewares: [middleware],
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
    })

    return builder as typeof builder & ConflictContextGuard<TInitialContext & UOutContext>
  }

  meta(meta: TMeta): ProcedureBuilder<TInitialContext, TInitialContext, Record<never, never>, TMeta> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      middlewares: [],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(route: Route): ProcedureBuilder<TInitialContext, TInitialContext, Record<never, never>, TMeta> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      middlewares: [],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithInput<TInitialContext, TInitialContext, USchema, Record<never, never>, TMeta> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      middlewares: [],
      inputSchema: schema,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithOutput<TInitialContext, TInitialContext, USchema, Record<never, never>, TMeta> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      middlewares: [],
      outputSchema: schema,
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TInitialContext, undefined, undefined, UFuncOutput, Record<never, never>, TMeta>,
  ): DecoratedProcedure<TInitialContext, TInitialContext, undefined, undefined, UFuncOutput, Record<never, never>, TMeta> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      middlewares: [],
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TInitialContext, TInitialContext, Record<never, never>, TMeta> {
    return new RouterBuilder({
      middlewares: [],
      errorMap: {},
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TInitialContext, Record<never, never>, TMeta> {
    return new RouterBuilder({
      middlewares: [],
      errorMap: {},
      tags,
    })
  }

  router<U extends Router<TInitialContext, ContractRouter<TMeta>>>(router: U): U {
    return router
  }

  lazy<U extends Router<TInitialContext, ContractRouter<TMeta>>>(
    loader: () => Promise<{ default: U }>,
  ): AccessibleLazyRouter<FlattenLazy<U>> {
    return createAccessibleLazyRouter(flatLazy(lazy(loader)))
  }
}
