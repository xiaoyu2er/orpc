import type { ContractRouter, ErrorMap, ErrorMapSuggestions, HTTPPath, RouteOptions, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ContextGuard } from './context'
import type { FlattenLazy } from './lazy'
import type { Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import type { AdaptedRouter } from './router-builder'
import type { Context, MergeContext } from './types'
import { ContractProcedure } from '@orpc/contract'
import { BuilderWithErrorsMiddlewares } from './builder-with-errors-middlewares'
import { type ChainableImplementer, createChainableImplementer } from './implementer-chainable'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'

/**
 * `BuilderWithMiddlewares` is a branch of `Builder` which it has middlewares.
 *
 * Why?
 * - prevents .middleware after .use (can mislead the behavior)
 * - prevents .context after .use (middlewares required current context, so it tricky when change the current context)
 *
 */
export interface BuilderWithMiddlewaresDef<TContext extends Context, TExtraContext extends Context> {
  middlewares: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any, Record<never, never>>[]
  inputValidationIndex: number
  outputValidationIndex: number
}

export class BuilderWithMiddlewares<TContext extends Context, TExtraContext extends Context> {
  '~type' = 'BuilderHasMiddlewares' as const
  '~orpc': BuilderWithMiddlewaresDef<TContext, TExtraContext>

  constructor(def: BuilderWithMiddlewaresDef<TContext, TExtraContext>) {
    this['~orpc'] = def
  }

  use<U extends Context & ContextGuard<MergeContext<TContext, TExtraContext>>>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      U,
      unknown,
      unknown,
      Record<never, never>
    >,
  ): BuilderWithMiddlewares<TContext, MergeContext<TExtraContext, U>> {
    return new BuilderWithMiddlewares({
      ...this['~orpc'],
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
      middlewares: [...this['~orpc'].middlewares, middleware as any],
    })
  }

  errors<U extends ErrorMap & ErrorMapSuggestions>(errors: U): BuilderWithErrorsMiddlewares<TContext, TExtraContext, U> {
    return new BuilderWithErrorsMiddlewares({
      ...this['~orpc'],
      errorMap: errors,
    })
  }

  route(route: RouteOptions): ProcedureBuilder<TContext, TExtraContext, Record<never, never>> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: new ContractProcedure({
        route,
        InputSchema: undefined,
        OutputSchema: undefined,
        errorMap: {},
      }),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaInput<USchema>,
  ): ProcedureBuilderWithInput<TContext, TExtraContext, USchema, Record<never, never>> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      contract: new ContractProcedure({
        OutputSchema: undefined,
        InputSchema: schema,
        inputExample: example,
        errorMap: {},
      }),
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
  ): ProcedureBuilderWithOutput<TContext, TExtraContext, USchema, Record<never, never>> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      contract: new ContractProcedure({
        InputSchema: undefined,
        OutputSchema: schema,
        outputExample: example,
        errorMap: {},
      }),
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TContext, TExtraContext, undefined, undefined, UFuncOutput, Record<never, never>>,
  ): DecoratedProcedure<TContext, TExtraContext, undefined, undefined, UFuncOutput, Record<never, never>> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      contract: new ContractProcedure({
        InputSchema: undefined,
        OutputSchema: undefined,
        errorMap: {},
      }),
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TContext, TExtraContext, Record<never, never>> {
    return new RouterBuilder({
      middlewares: this['~orpc'].middlewares,
      errorMap: {},
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TContext, TExtraContext, Record<never, never>> {
    return new RouterBuilder({
      middlewares: this['~orpc'].middlewares,
      errorMap: {},
      tags,
    })
  }

  router<U extends Router<MergeContext<TContext, TExtraContext>, any>>(
    router: U,
  ): AdaptedRouter<TContext, U, Record<never, never>> {
    return new RouterBuilder<TContext, TExtraContext, Record<never, never>>({
      errorMap: {},
      ...this['~orpc'],
    }).router(router)
  }

  lazy<U extends Router<MergeContext<TContext, TExtraContext>, any>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<TContext, FlattenLazy<U>, Record<never, never>> {
    return new RouterBuilder<TContext, TExtraContext, Record<never, never>>({
      errorMap: {},
      ...this['~orpc'],
    }).lazy(loader)
  }

  contract<U extends ContractRouter<any>>(
    contract: U,
  ): ChainableImplementer<TContext, TExtraContext, U> {
    return createChainableImplementer(contract, this['~orpc'])
  }
}
