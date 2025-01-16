import type { ContractRouter, ErrorMap, ErrorMapSuggestions, HTTPPath, RouteOptions, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ContextGuard } from './context'
import type { FlattenLazy } from './lazy'
import type { Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import type { AdaptedRouter } from './router-builder'
import type { Context, MergeContext } from './types'
import { ContractProcedure } from '@orpc/contract'
import { BuilderWithErrors } from './builder-with-errors'
import { BuilderWithMiddlewares } from './builder-with-middlewares'
import { type ChainableImplementer, createChainableImplementer } from './implementer-chainable'
import { decorateMiddleware } from './middleware-decorated'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'

export interface BuilderDef<TContext extends Context> {
  types?: { context: TContext }
}

export class Builder<TContext extends Context> {
  '~type' = 'Builder' as const
  '~orpc': BuilderDef<TContext>

  constructor(def: BuilderDef<TContext>) {
    this['~orpc'] = def
  }

  context<UContext extends Context = TContext>(): Builder<UContext> {
    return this as any // just change at type level so safely cast here
  }

  middleware<UExtraContext extends Context & ContextGuard<TContext>, TInput, TOutput = any >(
    middleware: Middleware<TContext, UExtraContext, TInput, TOutput, Record<never, never>>,
  ): DecoratedMiddleware<TContext, UExtraContext, TInput, TOutput, Record<never, never>> {
    return decorateMiddleware(middleware)
  }

  errors<U extends ErrorMap & ErrorMapSuggestions>(errors: U): BuilderWithErrors<TContext, U> {
    return new BuilderWithErrors({
      errorMap: errors,
    })
  }

  use<U extends Context & ContextGuard<TContext>>(
    middleware: Middleware<TContext, U, unknown, unknown, Record<never, never>>,
  ): BuilderWithMiddlewares<TContext, U> {
    return new BuilderWithMiddlewares<TContext, U>({
      ...this['~orpc'],
      inputValidationIndex: 1,
      outputValidationIndex: 1,
      middlewares: [middleware as any], // FIXME: I believe we can remove `as any` here
    })
  }

  route(route: RouteOptions): ProcedureBuilder<TContext, undefined, Record<never, never>> {
    return new ProcedureBuilder({
      middlewares: [],
      inputValidationIndex: 0,
      outputValidationIndex: 0,
      contract: new ContractProcedure({
        route,
        InputSchema: undefined,
        OutputSchema: undefined,
        errorMap: {},
      }),
    })
  }

  input<USchema extends Schema>(schema: USchema, example?: SchemaInput<USchema>): ProcedureBuilderWithInput<TContext, undefined, USchema, Record<never, never>> {
    return new ProcedureBuilderWithInput({
      middlewares: [],
      inputValidationIndex: 0,
      outputValidationIndex: 0,
      contract: new ContractProcedure({
        OutputSchema: undefined,
        InputSchema: schema,
        inputExample: example,
        errorMap: {},
      }),
    })
  }

  output<USchema extends Schema>(schema: USchema, example?: SchemaOutput<USchema>): ProcedureBuilderWithOutput<TContext, undefined, USchema, Record<never, never>> {
    return new ProcedureBuilderWithOutput({
      middlewares: [],
      inputValidationIndex: 0,
      outputValidationIndex: 0,
      contract: new ContractProcedure({
        InputSchema: undefined,
        OutputSchema: schema,
        outputExample: example,
        errorMap: {},
      }),
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TContext, undefined, undefined, undefined, UFuncOutput, Record<never, never>>,
  ): DecoratedProcedure<TContext, undefined, undefined, undefined, UFuncOutput, Record<never, never>> {
    return new DecoratedProcedure({
      middlewares: [],
      inputValidationIndex: 0,
      outputValidationIndex: 0,
      contract: new ContractProcedure({
        InputSchema: undefined,
        OutputSchema: undefined,
        errorMap: {},
      }),
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TContext, undefined, Record<never, never>> {
    return new RouterBuilder({
      middlewares: [],
      errorMap: {},
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TContext, undefined, Record<never, never>> {
    return new RouterBuilder({
      middlewares: [],
      errorMap: {},
      tags,
    })
  }

  router<U extends Router<MergeContext<TContext, undefined>, any>>(
    router: U,
  ): AdaptedRouter<TContext, U, Record<never, never>> {
    return new RouterBuilder<TContext, undefined, Record<never, never>>({
      middlewares: [],
      errorMap: [],
    }).router(router)
  }

  lazy<U extends Router<MergeContext<TContext, undefined>, any>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<TContext, FlattenLazy<U>, Record<never, never>> {
    return new RouterBuilder<TContext, undefined, Record<never, never>>({
      middlewares: [],
      errorMap: {},
    }).lazy(loader)
  }

  contract<U extends ContractRouter<any>>(
    contract: U,
  ): ChainableImplementer<TContext, undefined, U> {
    return createChainableImplementer(contract, {
      middlewares: [],
      inputValidationIndex: 0,
      outputValidationIndex: 0,
    })
  }
}
