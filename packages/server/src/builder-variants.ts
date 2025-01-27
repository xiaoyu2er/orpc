import type { ContractRouter, ErrorMap, HTTPPath, MergedErrorMap, Meta, ORPCErrorConstructorMap, Route, Schema } from '@orpc/contract'
import type { BuilderDef } from './builder'
import type { ConflictContextGuard, Context, MergedContext } from './context'
import type { FlattenLazy } from './lazy-utils'
import type { Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { ProcedureBuilderWithoutInputMethods, ProcedureBuilderWithoutOutputMethods } from './procedure-builder-variants'
import type { DecoratedProcedure } from './procedure-decorated'
import type { AdaptedRouter, Router } from './router'
import type { RouterBuilder } from './router-builder'

export interface BuilderWithMiddlewares<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  'use': <U extends Context>(
    middleware: Middleware<TCurrentContext, U, unknown, unknown, ORPCErrorConstructorMap<TErrorMap>, TMeta>,
  ) => ConflictContextGuard<MergedContext<TCurrentContext, U>>
    & BuilderWithMiddlewares<TInitialContext, MergedContext<TCurrentContext, U>, TErrorMap, TMeta>

  'errors': < U extends ErrorMap>(
    errors: U,
  ) => BuilderWithMiddlewares<TInitialContext, TCurrentContext, MergedErrorMap<TErrorMap, U>, TMeta>

  'meta': (meta: TMeta) => BuilderWithMiddlewares<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  'route': (route: Route) => BuilderWithMiddlewares<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  'input': <USchema extends Schema>(
    schema: USchema,
  ) => ProcedureBuilderWithoutInputMethods<TInitialContext, TCurrentContext, USchema, undefined, TErrorMap, TMeta>

  'output': <USchema extends Schema>(
    schema: USchema,
  ) => ProcedureBuilderWithoutOutputMethods<TInitialContext, TCurrentContext, undefined, USchema, TErrorMap, TMeta>

  'handler': <UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, undefined, undefined, UFuncOutput, TErrorMap, TMeta>,
  ) => DecoratedProcedure<TInitialContext, TCurrentContext, undefined, undefined, UFuncOutput, TErrorMap, TMeta>

  'prefix': (prefix: HTTPPath) => RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  'tag': (...tags: string[]) => RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  'router': <U extends Router<TCurrentContext, ContractRouter<TMeta>>>(
    router: U,
  ) => AdaptedRouter<U, TInitialContext, TErrorMap>

  'lazy': <U extends Router<TCurrentContext, ContractRouter<TMeta>>>(
    loader: () => Promise<{ default: U }>,
  ) => AdaptedRouter<FlattenLazy<U>, TInitialContext, TErrorMap>
}
