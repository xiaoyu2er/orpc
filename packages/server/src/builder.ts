import type { AnySchema, ContractProcedureDef, ContractRouter, ErrorMap, HTTPPath, MergedErrorMap, Meta, Route, Schema } from '@orpc/contract'
import type { BuilderWithMiddlewares, ProcedureBuilder, ProcedureBuilderWithInput, ProcedureBuilderWithOutput, RouterBuilder } from './builder-variants'
import type { ConflictContextGuard, Context, MergedContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { Lazy } from './lazy'
import type { AnyMiddleware, MapInputMiddleware, Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import type { EnhancedRouter, EnhanceRouterOptions } from './router-utils'
import { mergeErrorMap, mergeMeta, mergePrefix, mergeRoute, mergeTags } from '@orpc/contract'
import { fallbackConfig } from './config'
import { lazy } from './lazy'
import { decorateMiddleware } from './middleware-decorated'
import { addMiddleware } from './middleware-utils'
import { DecoratedProcedure } from './procedure-decorated'
import { enhanceRouter } from './router-utils'

export interface BuilderConfig {
  initialInputValidationIndex?: number
  initialOutputValidationIndex?: number
}

export interface BuilderDef<
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>, EnhanceRouterOptions< TErrorMap> {
  middlewares: AnyMiddleware[]
  inputValidationIndex: number
  outputValidationIndex: number
  config: BuilderConfig
}

export class Builder<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  constructor(def: BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>) {
    this['~orpc'] = def
  }

  /**
   * Reset config
   */
  $config(config: BuilderConfig): Builder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    const inputValidationCount = this['~orpc'].inputValidationIndex - fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex)
    const outputValidationCount = this['~orpc'].outputValidationIndex - fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex)

    return new Builder({
      ...this['~orpc'],
      config,
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', config.initialInputValidationIndex) + inputValidationCount,
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', config.initialOutputValidationIndex) + outputValidationCount,
    })
  }

  /**
   * Reset initial context
   */
  $context<U extends Context>(): Builder<U, U, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      middlewares: [],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex),
    })
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

  $input<U extends AnySchema>(
    initialInputSchema?: U,
  ): Builder<TInitialContext, TCurrentContext, U, TOutputSchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      inputSchema: initialInputSchema,
    })
  }

  middleware<UOutContext extends Context, TInput, TOutput = any>( // = any here is important to make middleware can be used in any output by default
    middleware: Middleware<TCurrentContext, UOutContext, TInput, TOutput, ORPCErrorConstructorMap<TErrorMap>, TMeta>,
  ): DecoratedMiddleware<TCurrentContext, UOutContext, TInput, TOutput, ORPCErrorConstructorMap<any>, TMeta> { // ORPCErrorConstructorMap<any> ensures middleware can used in any procedure
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
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      unknown,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>> &
    BuilderWithMiddlewares<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    >

  use<UOutContext extends Context, UInput>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      UInput,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
    mapInput: MapInputMiddleware<unknown, UInput>,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>> &
    BuilderWithMiddlewares<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    >

  use(
    middleware: AnyMiddleware,
    mapInput?: MapInputMiddleware<any, any>,
  ): BuilderWithMiddlewares<any, any, any, any, any, any> {
    const mapped = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new Builder({
      ...this['~orpc'],
      middlewares: addMiddleware(this['~orpc'].middlewares, mapped),
    }) as any
  }

  meta(
    meta: TMeta,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
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

  input<USchema extends AnySchema>(
    schema: USchema,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, USchema, TOutputSchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      inputSchema: schema,
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex) + this['~orpc'].middlewares.length,
    }) as any
  }

  output<USchema extends AnySchema>(
    schema: USchema,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TInputSchema, USchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      outputSchema: schema,
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex) + this['~orpc'].middlewares.length,
    }) as any
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, unknown, UFuncOutput, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, Schema<UFuncOutput, UFuncOutput>, TErrorMap, TMeta> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }

  prefix(
    prefix: HTTPPath,
  ): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      prefix: mergePrefix(this['~orpc'].prefix, prefix),
    }) as any
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      tags: mergeTags(this['~orpc'].tags, tags),
    }) as any
  }

  router<U extends Router<ContractRouter<TMeta>, TCurrentContext>>(
    router: U,
  ): EnhancedRouter<U, TInitialContext, TErrorMap> {
    return enhanceRouter(router, this['~orpc'])
  }

  lazy<U extends Router<ContractRouter<TMeta>, TCurrentContext>>(
    loader: () => Promise<{ default: U }>,
  ): EnhancedRouter<Lazy<U>, TInitialContext, TErrorMap> {
    return enhanceRouter(lazy(loader), this['~orpc'])
  }
}

export const os = new Builder<
  Record<never, never>,
  Record<never, never>,
  Schema<unknown, unknown>,
  Schema<unknown, unknown>,
  Record<never, never>,
  Record<never, never>
>({
  config: {},
  route: {},
  meta: {},
  errorMap: {},
  inputValidationIndex: fallbackConfig('initialInputValidationIndex'),
  outputValidationIndex: fallbackConfig('initialOutputValidationIndex'),
  middlewares: [],
})
