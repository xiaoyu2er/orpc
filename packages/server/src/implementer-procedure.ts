import type { ClientContext, ClientRest } from '@orpc/client'
import type { AnySchema, ErrorMap, InferSchemaInput, InferSchemaOutput, Meta } from '@orpc/contract'
import type { IntersectPick, MaybeOptionalOptions } from '@orpc/shared'
import type { BuilderDef } from './builder'
import type { Context, ContextExtendsGuard, MergedCurrentContext, MergedInitialContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { MapInputMiddleware, Middleware } from './middleware'
import type { Procedure, ProcedureHandler } from './procedure'
import type { CreateProcedureClientOptions, ProcedureClient } from './procedure-client'

/**
 * Like `DecoratedProcedure`, but removed all method that can change the contract.
 */
export interface ImplementedProcedure<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  use<UOutContext extends Context, UInContext extends IntersectPick<TCurrentContext, UInContext> = TCurrentContext>(
    middleware: Middleware<
      UInContext,
      UOutContext,
      InferSchemaOutput<TInputSchema>,
      InferSchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ContextExtendsGuard<MergedCurrentContext<TCurrentContext, UOutContext>, TCurrentContext>
    & ImplementedProcedure<
      MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
      MergedCurrentContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    >

  use<UOutContext extends Context, UInput, UInContext extends IntersectPick<TCurrentContext, UInContext> = TCurrentContext>(
    middleware: Middleware<
      UInContext,
      UOutContext,
      UInput,
      InferSchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
    mapInput: MapInputMiddleware<InferSchemaOutput<TInputSchema>, UInput>,
  ): ContextExtendsGuard<MergedCurrentContext<TCurrentContext, UOutContext>, TCurrentContext>
    & ImplementedProcedure<
      MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
      MergedCurrentContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    >

  /**
   * Make this procedure callable (works like a function while still being a procedure).
   */
  callable<TClientContext extends ClientContext>(
    ...rest: MaybeOptionalOptions<
      CreateProcedureClientOptions<
        TInitialContext,
        TInputSchema,
        TOutputSchema,
        TErrorMap,
        TMeta,
        TClientContext
      >
    >
  ): ImplementedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
    & ProcedureClient<TClientContext, TInputSchema, TOutputSchema, TErrorMap >

  /**
   * Make this procedure compatible with server action (the same as .callable, but the type is compatible with server action).
   */
  actionable<TClientContext extends ClientContext>(
    ...rest: MaybeOptionalOptions<
      CreateProcedureClientOptions<
        TInitialContext,
        TInputSchema,
        TOutputSchema,
        TErrorMap,
        TMeta,
        TClientContext
      >
    >
  ): ImplementedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>
    & ((...rest: ClientRest<TClientContext, InferSchemaInput<TInputSchema>>) => Promise<InferSchemaOutput<TOutputSchema>>)
}

/**
 * Like `ProcedureBuilderWithoutHandler`, but removed all method that can change the contract.
 */
export interface ProcedureImplementer<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'use'<UOutContext extends Context, UInContext extends IntersectPick<TCurrentContext, UInContext> = TCurrentContext>(
    middleware: Middleware<
      UInContext,
      UOutContext,
      InferSchemaOutput<TInputSchema>,
      InferSchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ProcedureImplementer<
    MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
    MergedCurrentContext<TCurrentContext, UOutContext>,
    TInputSchema,
    TOutputSchema,
    TErrorMap,
    TMeta
  >

  'use'<UOutContext extends Context, UInput, UInContext extends IntersectPick<TCurrentContext, UInContext> = TCurrentContext>(
    middleware: Middleware<
      UInContext,
      UOutContext,
      UInput,
      InferSchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
    mapInput: MapInputMiddleware<InferSchemaOutput<TInputSchema>, UInput>,
  ): ProcedureImplementer<
    MergedInitialContext<TInitialContext, UInContext, TCurrentContext>,
    MergedCurrentContext<TCurrentContext, UOutContext>,
    TInputSchema,
    TOutputSchema,
    TErrorMap,
    TMeta
  >

  'handler'(
    handler: ProcedureHandler<TCurrentContext, InferSchemaOutput<TInputSchema>, InferSchemaInput<TOutputSchema>, TErrorMap, TMeta>,
  ): ImplementedProcedure<
    TInitialContext,
    TCurrentContext,
    TInputSchema,
    TOutputSchema,
    TErrorMap,
    TMeta
  >
}
