import type { ContractRouter, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, HTTPPath, RouteOptions, Schema, SchemaInput, SchemaOutput, StrictErrorMap } from '@orpc/contract'
import type { ORPCErrorConstructorMap } from './error'
import type { FlattenLazy } from './lazy'
import type { Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import type { AdaptedRouter } from './router-builder'
import type { Context, MergeContext, WELL_CONTEXT } from './types'
import { ContractProcedure } from '@orpc/contract'
import { type ChainableImplementer, createChainableImplementer } from './implementer-chainable'
import { decorateMiddleware } from './middleware-decorated'
import { ProcedureBuilder } from './procedure-builder'
import { DecoratedProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'

export interface BuilderDef<TContext extends Context, TExtraContext extends Context, TErrorMap extends ErrorMap> {
  middlewares: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any, Record<never, never>>[]
  errorMap: TErrorMap
}

export class Builder<TContext extends Context, TExtraContext extends Context, TErrorMap extends ErrorMap> {
  '~type' = 'Builder' as const
  '~orpc': BuilderDef<TContext, TExtraContext, TErrorMap>

  constructor(def: BuilderDef<TContext, TExtraContext, TErrorMap>) {
    this['~orpc'] = def
  }

  // TODO: separate it
  context<UContext extends Context = WELL_CONTEXT>(): Builder<UContext, undefined, Record<never, never>> {
    return new Builder({
      middlewares: [],
      errorMap: {},
    })
  }

  use<U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      U,
      unknown,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>
    >,
  ): Builder<TContext, MergeContext<TExtraContext, U>, TErrorMap> {
    return new Builder({
      ...this['~orpc'],
      middlewares: [...this['~orpc'].middlewares, middleware as any],
    })
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(errors: U): Builder<TContext, TExtraContext, TErrorMap & U> {
    return new Builder({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  // TODO: not allow define middleware after has context, or anything else
  middleware<
    UExtraContext extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined,
    TInput = unknown,
    TOutput = any,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      TInput,
      TOutput,
      Record<never, never>
    >,
  ): DecoratedMiddleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      TInput,
      TOutput,
      Record<never, never>
    > {
    return decorateMiddleware(middleware)
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

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaInput<USchema>,
  ): ProcedureBuilder<TContext, TExtraContext, USchema, undefined, TErrorMap> {
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

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
  ): ProcedureBuilder<TContext, TExtraContext, undefined, USchema, TErrorMap> {
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

  handler<UFuncOutput = undefined>(
    handler: ProcedureHandler<TContext, TExtraContext, undefined, undefined, UFuncOutput, TErrorMap>,
  ): DecoratedProcedure<TContext, TExtraContext, undefined, undefined, UFuncOutput, TErrorMap> {
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
      middlewares: this['~orpc'].middlewares,
      errorMap: this['~orpc'].errorMap,
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TContext, TExtraContext, TErrorMap> {
    return new RouterBuilder({
      middlewares: this['~orpc'].middlewares,
      errorMap: this['~orpc'].errorMap,
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

  contract<U extends ContractRouter<any>>(
    contract: U,
  ): ChainableImplementer<TContext, TExtraContext, U> {
    return createChainableImplementer(contract, this['~orpc'].middlewares)
  }
}
