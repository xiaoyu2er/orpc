import type { ContractRouter, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, HTTPPath, RouteOptions, Schema, SchemaInput, SchemaOutput, StrictErrorMap } from '@orpc/contract'
import type { ContextGuard } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { FlattenLazy } from './lazy'
import type { Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import type { AdaptedRouter } from './router-builder'
import type { Context, MergeContext } from './types'
import { ContractProcedure } from '@orpc/contract'
import { ProcedureBuilder } from './procedure-builder'
import { DecoratedProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'

export interface BuilderWithErrorsMiddlewaresDef<TContext extends Context, TExtraContext extends Context, TErrorMap extends ErrorMap> {
  types?: { context: TContext }
  errorMap: TErrorMap
  middlewares: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any, ORPCErrorConstructorMap<TErrorMap>>[]
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
export class BuilderWithErrorsMiddlewares<TContext extends Context, TExtraContext extends Context, TErrorMap extends ErrorMap> {
  '~type' = 'BuilderWithErrorsMiddlewares' as const
  '~orpc': BuilderWithErrorsMiddlewaresDef<TContext, TExtraContext, TErrorMap>

  constructor(def: BuilderWithErrorsMiddlewaresDef<TContext, TExtraContext, TErrorMap>) {
    this['~orpc'] = def
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(errors: U): BuilderWithErrorsMiddlewares<TContext, TExtraContext, TErrorMap & U> {
    return new BuilderWithErrorsMiddlewares({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  use<U extends Context & ContextGuard<MergeContext<TContext, TExtraContext>>>(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, U, unknown, unknown, ORPCErrorConstructorMap<TErrorMap>>,
  ): BuilderWithErrorsMiddlewares<TContext, MergeContext<TExtraContext, U>, TErrorMap> {
    return new BuilderWithErrorsMiddlewares<TContext, MergeContext<TExtraContext, U>, TErrorMap>({
      ...this['~orpc'],
      middlewares: [...this['~orpc'].middlewares, middleware as any], // FIXME: I believe we can remove `as any` here
    })
  }

  route(route: RouteOptions): ProcedureBuilder<TContext, TExtraContext, undefined, undefined, TErrorMap> {
    return new ProcedureBuilder({
      middlewares: this['~orpc'].middlewares,
      contract: new ContractProcedure({
        route,
        InputSchema: undefined,
        OutputSchema: undefined,
        errorMap: this['~orpc'].errorMap,
      }),
    })
  }

  input<USchema extends Schema>(schema: USchema, example?: SchemaInput<USchema>): ProcedureBuilder<TContext, TExtraContext, USchema, undefined, TErrorMap> {
    return new ProcedureBuilder({
      middlewares: this['~orpc'].middlewares,
      contract: new ContractProcedure({
        OutputSchema: undefined,
        InputSchema: schema,
        inputExample: example,
        errorMap: this['~orpc'].errorMap,
      }),
    })
  }

  output<USchema extends Schema>(schema: USchema, example?: SchemaOutput<USchema>): ProcedureBuilder<TContext, TExtraContext, undefined, USchema, TErrorMap> {
    return new ProcedureBuilder({
      middlewares: this['~orpc'].middlewares,
      contract: new ContractProcedure({
        InputSchema: undefined,
        OutputSchema: schema,
        outputExample: example,
        errorMap: this['~orpc'].errorMap,
      }),
    })
  }

  handler<UFuncOutput>(handler: ProcedureHandler<TContext, TExtraContext, undefined, undefined, UFuncOutput, TErrorMap>): DecoratedProcedure<TContext, TExtraContext, undefined, undefined, UFuncOutput, TErrorMap> {
    return new DecoratedProcedure({
      preMiddlewares: this['~orpc'].middlewares,
      postMiddlewares: [],
      contract: new ContractProcedure({
        InputSchema: undefined,
        OutputSchema: undefined,
        errorMap: this['~orpc'].errorMap,
      }),
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TContext, TExtraContext, TErrorMap> {
    return new RouterBuilder({
      ...this['~orpc'],
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TContext, TExtraContext, TErrorMap> {
    return new RouterBuilder({
      ...this['~orpc'],
      tags,
    })
  }

  router<U extends Router<MergeContext<TContext, TExtraContext>, ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>>(
    router: U,
  ): AdaptedRouter<TContext, U, TErrorMap> {
    return new RouterBuilder<TContext, TExtraContext, TErrorMap>(this['~orpc']).router(router)
  }

  lazy<U extends Router<MergeContext<TContext, TExtraContext>, ContractRouter<ErrorMap & Partial<StrictErrorMap<TErrorMap>>>>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<TContext, FlattenLazy<U>, TErrorMap> {
    return new RouterBuilder<TContext, TExtraContext, TErrorMap>(this['~orpc']).lazy(loader)
  }
}
