import {
  ContractProcedure,
  type ContractRouter,
  type HTTPMethod,
  type HTTPPath,
  type IsEqual,
  type Schema,
  type SchemaOutput,
  isContractProcedure,
} from '@orpc/contract'
import {
  type DecoratedMiddleware,
  type MapInputMiddleware,
  type Middleware,
  decorateMiddleware,
} from './middleware'
import { Procedure, type ProcedureHandler } from './procedure'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureImplementer } from './procedure-implementer'
import { type DecoratedRouter, type Router, decorateRouter } from './router'
import {
  type ChainedRouterImplementer,
  chainRouterImplementer,
} from './router-implementer'
import type { Context, MergeContext } from './types'

export class Builder<TContext extends Context, TExtraContext extends Context> {
  constructor(
    public __b: {
      middlewares?: Middleware<TContext, any, any, any>[]
    } = {},
  ) {}

  /**
   * Self chainable
   */

  context<UContext extends Context>(): IsEqual<UContext, Context> extends true
    ? Builder<TContext, TExtraContext>
    : Builder<UContext, TExtraContext> {
    return this as any
  }

  use<
    UExtraContext extends
      | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
      | undefined = undefined,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      unknown,
      unknown
    >,
  ): Builder<TContext, MergeContext<TExtraContext, UExtraContext>>

  use<
    UExtraContext extends
      | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
      | undefined = undefined,
    UMappedInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      unknown
    >,
    mapInput: MapInputMiddleware<unknown, UMappedInput>,
  ): Builder<TContext, MergeContext<TExtraContext, UExtraContext>>

  use(
    middleware_: Middleware<any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): Builder<any, any> {
    const middleware: Middleware<any, any, any, any> =
      typeof mapInput === 'function'
        ? (input, ...rest) => middleware(mapInput(input), ...rest)
        : middleware_

    return new Builder({
      ...this.__b,
      middlewares: [...(this.__b.middlewares || []), middleware],
    })
  }

  /**
   * Convert to ContractProcedureBuilder
   */

  route(opts: {
    method?: HTTPMethod
    path?: HTTPPath
    summary?: string
    description?: string
    deprecated?: boolean
  }): ProcedureBuilder<TContext, TExtraContext, undefined, undefined> {
    return new ProcedureBuilder({
      ...opts,
      InputSchema: undefined,
      OutputSchema: undefined,
      middlewares: this.__b.middlewares,
    })
  }

  input<USchema extends Schema = undefined>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): ProcedureBuilder<TContext, TExtraContext, USchema, undefined> {
    return new ProcedureBuilder({
      OutputSchema: undefined,
      InputSchema: schema,
      inputExample: example,
      inputExamples: examples,
      middlewares: this.__b.middlewares,
    })
  }

  output<USchema extends Schema = undefined>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): ProcedureBuilder<TContext, TExtraContext, undefined, USchema> {
    return new ProcedureBuilder({
      InputSchema: undefined,
      OutputSchema: schema,
      outputExample: example,
      outputExamples: examples,
      middlewares: this.__b.middlewares,
    })
  }

  /**
   * Convert to Procedure
   */
  handler<UHandlerOutput = undefined>(
    handler: ProcedureHandler<
      TContext,
      ContractProcedure<undefined, undefined>,
      TExtraContext,
      UHandlerOutput
    >,
  ): Procedure<
    TContext,
    ContractProcedure<undefined, undefined>,
    TExtraContext,
    UHandlerOutput
  > {
    return new Procedure({
      middlewares: this.__b.middlewares,
      contract: new ContractProcedure({
        InputSchema: undefined,
        OutputSchema: undefined,
      }),
      handler,
    })
  }

  /**
   * Convert to ProcedureImplementer | RouterBuilder
   */

  contract<UContract extends ContractProcedure<any, any> | ContractRouter>(
    contract: UContract,
  ): UContract extends ContractProcedure<any, any>
    ? ProcedureImplementer<TContext, UContract, TExtraContext>
    : ChainedRouterImplementer<TContext, UContract, TExtraContext> {
    if (isContractProcedure(contract)) {
      return new ProcedureImplementer({
        contract,
        middlewares: this.__b.middlewares,
      }) as any
    }

    return chainRouterImplementer(contract, this.__b.middlewares) as any
  }

  /**
   * Create ExtendedMiddleware
   */

  middleware<UExtraContext extends Context = undefined, TInput = unknown>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      TInput,
      unknown
    >,
  ): DecoratedMiddleware<
    MergeContext<TContext, TExtraContext>,
    UExtraContext,
    TInput,
    unknown
  > {
    return decorateMiddleware(middleware)
  }

  /**
   * Create DecoratedRouter
   */
  router<URouter extends Router<TContext, any>>(
    router: URouter,
  ): DecoratedRouter<URouter> {
    return decorateRouter(router)
  }
}
