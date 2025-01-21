import type { ContractBuilderConfig, ContractRouter, ErrorMap, ErrorMapSuggestions, HTTPPath, Route, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ConflictContextGuard, Context, TypeCurrentContext, TypeInitialContext } from './context'
import type { Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { Router } from './router'
import type { UnshiftedMiddlewaresRouter } from './router-utils'
import { ContractProcedure, fallbackContractConfig } from '@orpc/contract'
import { BuilderWithErrorsMiddlewares } from './builder-with-errors-middlewares'
import { type ChainableImplementer, createChainableImplementer } from './implementer-chainable'
import { flatLazy, type FlattenLazy, lazy } from './lazy'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'
import { unshiftMiddlewaresRouter } from './router-utils'

/**
 * `BuilderWithMiddlewares` is a branch of `Builder` which it has middlewares.
 *
 * Why?
 * - prevents .middleware after .use (can mislead the behavior)
 * - prevents .context after .use (middlewares required current context, so it tricky when change the current context)
 *
 */
export interface BuilderWithMiddlewaresDef<TInitialContext extends Context, TCurrentContext extends Context> {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  config: ContractBuilderConfig
  middlewares: Middleware<any, any, any, any, any>[]
  inputValidationIndex: number
  outputValidationIndex: number
}

export class BuilderWithMiddlewares<TInitialContext extends Context, TCurrentContext extends Context> {
  '~type' = 'BuilderHasMiddlewares' as const
  '~orpc': BuilderWithMiddlewaresDef<TInitialContext, TCurrentContext>

  constructor(def: BuilderWithMiddlewaresDef<TInitialContext, TCurrentContext>) {
    this['~orpc'] = def
  }

  use<U extends Context>(
    middleware: Middleware<TCurrentContext, U, unknown, unknown, Record<never, never> >,
  ): ConflictContextGuard<TCurrentContext & U>
    & BuilderWithMiddlewares<TInitialContext, TCurrentContext & U> {
    const builder = new BuilderWithMiddlewares<TInitialContext, TCurrentContext & U>({
      config: this['~orpc'].config,
      inputValidationIndex: this['~orpc'].inputValidationIndex + 1,
      outputValidationIndex: this['~orpc'].outputValidationIndex + 1,
      middlewares: [...this['~orpc'].middlewares, middleware],
    })

    return builder as typeof builder & ConflictContextGuard<TCurrentContext & U>
  }

  errors<U extends ErrorMap & ErrorMapSuggestions>(
    errors: U,
  ): BuilderWithErrorsMiddlewares<TInitialContext, TCurrentContext, U> {
    return new BuilderWithErrorsMiddlewares({
      ...this['~orpc'],
      errorMap: errors,
    })
  }

  route(route: Route): ProcedureBuilder<TInitialContext, TCurrentContext, Record<never, never>> {
    return new ProcedureBuilder({
      ...this['~orpc'],
      contract: new ContractProcedure({
        route: {
          ...this['~orpc'].config.initialRoute,
          ...route,
        },
        InputSchema: undefined,
        outputSchema: undefined,
        errorMap: {},
      }),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaInput<USchema>,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, USchema, Record<never, never>> {
    return new ProcedureBuilderWithInput({
      ...this['~orpc'],
      contract: new ContractProcedure({
        route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
        outputSchema: undefined,
        InputSchema: schema,
        inputExample: example,
        errorMap: {},
      }),
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, USchema, Record<never, never>> {
    return new ProcedureBuilderWithOutput({
      ...this['~orpc'],
      contract: new ContractProcedure({
        route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
        InputSchema: undefined,
        outputSchema: schema,
        outputExample: example,
        errorMap: {},
      }),
    })
  }

  handler<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, undefined, undefined, UFuncOutput, Record<never, never>>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, undefined, undefined, UFuncOutput, Record<never, never>, Route> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      contract: new ContractProcedure({
        route: fallbackContractConfig('defaultInitialRoute', this['~orpc'].config.initialRoute),
        InputSchema: undefined,
        outputSchema: undefined,
        errorMap: {},
      }),
      handler,
    })
  }

  prefix(prefix: HTTPPath): RouterBuilder<TInitialContext, TCurrentContext, Record<never, never>> {
    return new RouterBuilder({
      middlewares: this['~orpc'].middlewares,
      errorMap: {},
      prefix,
    })
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TCurrentContext, Record<never, never>> {
    return new RouterBuilder({
      middlewares: this['~orpc'].middlewares,
      errorMap: {},
      tags,
    })
  }

  router<U extends Router<TCurrentContext, any>>(
    router: U,
  ): UnshiftedMiddlewaresRouter<U, TInitialContext> {
    return unshiftMiddlewaresRouter(router, this['~orpc'])
  }

  lazy<U extends Router<TCurrentContext, any>>(
    loader: () => Promise<{ default: U }>,
  ): UnshiftedMiddlewaresRouter<FlattenLazy<U>, TInitialContext> {
    return unshiftMiddlewaresRouter(flatLazy(lazy(loader)), this['~orpc'])
  }

  contract<U extends ContractRouter<any>>(
    contract: U,
  ): ChainableImplementer<TInitialContext, TCurrentContext, U> {
    return createChainableImplementer(contract, this['~orpc'])
  }
}
