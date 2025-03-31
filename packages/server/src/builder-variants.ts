import type { HTTPPath } from '@orpc/client'
import type { AnySchema, ContractRouter, ErrorMap, InferSchemaInput, InferSchemaOutput, MergedErrorMap, Meta, Route, Schema } from '@orpc/contract'
import type { IntersectPick } from '@orpc/shared'
import type { BuilderDef } from './builder'
import type { Context, MergedCurrentContext, MergedInitialContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { Lazy } from './lazy'
import type { MapInputMiddleware, Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { Router } from './router'
import type { EnhancedRouter, EnhanceRouterOptions } from './router-utils'

export interface BuilderWithMiddlewares<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'errors'<U extends ErrorMap>(
    errors: U,
  ): BuilderWithMiddlewares<
    TInitialContext,
    TCurrentContext,
    TInputSchema,
    TOutputSchema,
    MergedErrorMap<TErrorMap, U>,
    TMeta
  >

  'use'<UOutContext extends IntersectPick<TCurrentContext, UOutContext>, UInContext extends Context = TCurrentContext>(
    middleware: Middleware<
      UInContext | TCurrentContext,
      UOutContext,
      unknown,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): BuilderWithMiddlewares<
    MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
    MergedCurrentContext<TCurrentContext, UOutContext>,
    TInputSchema,
    TOutputSchema,
    TErrorMap,
    TMeta
  >

  'meta'(
    meta: TMeta,
  ): BuilderWithMiddlewares<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'route'(
    route: Route,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'input'<USchema extends AnySchema>(
    schema: USchema,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, USchema, TOutputSchema, TErrorMap, TMeta>

  'output'<USchema extends AnySchema>(
    schema: USchema,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TInputSchema, USchema, TErrorMap, TMeta>

  'handler'<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, unknown, UFuncOutput, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, Schema<UFuncOutput, UFuncOutput>, TErrorMap, TMeta>

  'prefix'(prefix: HTTPPath): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  'tag'(...tags: string[]): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  'router'<U extends Router<ContractRouter<TMeta>, TCurrentContext>>(
    router: U
  ): EnhancedRouter<U, TInitialContext, TCurrentContext, TErrorMap>

  'lazy'<U extends Router<ContractRouter<TMeta>, TCurrentContext>>(
    loader: () => Promise<{ default: U }>,
  ): EnhancedRouter<Lazy<U>, TInitialContext, TCurrentContext, TErrorMap>
}

export interface ProcedureBuilder<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'errors'<U extends ErrorMap>(
    errors: U,
  ): ProcedureBuilder<
    TInitialContext,
    TCurrentContext,
    TInputSchema,
    TOutputSchema,
    MergedErrorMap<TErrorMap, U>,
    TMeta
  >

  'use'<UOutContext extends IntersectPick<TCurrentContext, UOutContext>, UInContext extends Context = TCurrentContext>(
    middleware: Middleware<
      UInContext | TCurrentContext,
      UOutContext,
      unknown,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ProcedureBuilder<
    MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
    MergedCurrentContext<TCurrentContext, UOutContext>,
    TInputSchema,
    TOutputSchema,
    TErrorMap,
    TMeta
  >

  'meta'(
    meta: TMeta,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'route'(
    route: Route,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'input'<USchema extends AnySchema>(
    schema: USchema,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, USchema, TOutputSchema, TErrorMap, TMeta>

  'output'<USchema extends AnySchema>(
    schema: USchema,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TInputSchema, USchema, TErrorMap, TMeta>

  'handler'<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, unknown, UFuncOutput, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, Schema<UFuncOutput, UFuncOutput>, TErrorMap, TMeta>
}

export interface ProcedureBuilderWithInput<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'errors'<U extends ErrorMap>(
    errors: U,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta>

  'use'<UOutContext extends IntersectPick<TCurrentContext, UOutContext>, UInContext extends Context = TCurrentContext>(
    middleware: Middleware<
      UInContext | TCurrentContext,
      UOutContext,
      InferSchemaOutput<TInputSchema>,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ProcedureBuilderWithInput<
    MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
    MergedCurrentContext<TCurrentContext, UOutContext>,
    TInputSchema,
    TOutputSchema,
    TErrorMap,
    TMeta
  >

  'use'<UOutContext extends IntersectPick<TCurrentContext, UOutContext>, UInput, UInContext extends Context = TCurrentContext>(
    middleware: Middleware<
      UInContext | TCurrentContext,
      UOutContext,
      UInput,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
    mapInput: MapInputMiddleware<InferSchemaOutput<TInputSchema>, UInput>,
  ): ProcedureBuilderWithInput<
    MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
    MergedCurrentContext<TCurrentContext, UOutContext>,
    TInputSchema,
    TOutputSchema,
    TErrorMap,
    TMeta
  >

  'meta'(
    meta: TMeta,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'route'(
    route: Route,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'output'<USchema extends AnySchema>(
    schema: USchema,
  ): ProcedureBuilderWithInputOutput<TInitialContext, TCurrentContext, TInputSchema, USchema, TErrorMap, TMeta>

  'handler'<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, InferSchemaOutput<TInputSchema>, UFuncOutput, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, Schema<UFuncOutput, UFuncOutput>, TErrorMap, TMeta>
}

export interface ProcedureBuilderWithOutput<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'errors'<U extends ErrorMap>(
    errors: U,
  ): ProcedureBuilderWithOutput<
    TInitialContext,
    TCurrentContext,
    TInputSchema,
    TOutputSchema,
    MergedErrorMap<TErrorMap, U>,
    TMeta
  >

  'use'<UOutContext extends IntersectPick<TCurrentContext, UOutContext>, UInContext extends Context = TCurrentContext>(
    middleware: Middleware<
      UInContext | TCurrentContext,
      UOutContext,
      unknown,
      InferSchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ProcedureBuilderWithOutput<
    MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
    MergedCurrentContext<TCurrentContext, UOutContext>,
    TInputSchema,
    TOutputSchema,
    TErrorMap,
    TMeta
  >

  'meta'(
    meta: TMeta,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'route'(
    route: Route,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'input'<USchema extends AnySchema>(
    schema: USchema,
  ): ProcedureBuilderWithInputOutput<TInitialContext, TCurrentContext, USchema, TOutputSchema, TErrorMap, TMeta>

  'handler'(
    handler: ProcedureHandler<TCurrentContext, unknown, InferSchemaInput<TOutputSchema>, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
}

export interface ProcedureBuilderWithInputOutput<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'errors'<U extends ErrorMap>(
    errors: U,
  ): ProcedureBuilderWithInputOutput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta>

  'use'<UOutContext extends IntersectPick<TCurrentContext, UOutContext>, UInContext extends Context = TCurrentContext>(
    middleware: Middleware<
      UInContext | TCurrentContext,
      UOutContext,
      InferSchemaOutput<TInputSchema>,
      InferSchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ProcedureBuilderWithInputOutput<
    MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
    MergedCurrentContext<TCurrentContext, UOutContext>,
    TInputSchema,
    TOutputSchema,
    TErrorMap,
    TMeta
  >

  'use'<UOutContext extends IntersectPick<TCurrentContext, UOutContext>, UInput, UInContext extends Context = TCurrentContext>(
    middleware: Middleware<
      UInContext | TCurrentContext,
      UOutContext,
      UInput,
      InferSchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
    mapInput: MapInputMiddleware<InferSchemaOutput<TInputSchema>, UInput>,
  ): ProcedureBuilderWithInputOutput<
    MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
    MergedCurrentContext<TCurrentContext, UOutContext>,
    TInputSchema,
    TOutputSchema,
    TErrorMap,
    TMeta
  >

  'meta'(
    meta: TMeta,
  ): ProcedureBuilderWithInputOutput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'route'(
    route: Route,
  ): ProcedureBuilderWithInputOutput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'handler'(
    handler: ProcedureHandler<TCurrentContext, InferSchemaOutput<TInputSchema>, InferSchemaInput<TOutputSchema>, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
}

export interface RouterBuilder<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': EnhanceRouterOptions<TErrorMap>

  'errors'<U extends ErrorMap>(
    errors: U,
  ): RouterBuilder<TInitialContext, TCurrentContext, MergedErrorMap<TErrorMap, U>, TMeta>

  'use'<UOutContext extends IntersectPick<TCurrentContext, UOutContext>, UInContext extends Context = TCurrentContext>(
    middleware: Middleware<
      UInContext | TCurrentContext,
      UOutContext,
      unknown,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): RouterBuilder<
    MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
    MergedCurrentContext<TCurrentContext, UOutContext>,
    TErrorMap,
    TMeta
  >

  'prefix'(prefix: HTTPPath): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  'tag'(...tags: string[]): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  'router'<U extends Router<ContractRouter<TMeta>, TCurrentContext>>(
    router: U
  ): EnhancedRouter<U, TInitialContext, TCurrentContext, TErrorMap>

  'lazy'<U extends Router<ContractRouter<TMeta>, TCurrentContext>>(
    loader: () => Promise<{ default: U }>,
  ): EnhancedRouter<Lazy<U>, TInitialContext, TCurrentContext, TErrorMap>
}
