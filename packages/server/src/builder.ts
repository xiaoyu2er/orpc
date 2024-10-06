import {
  type ContractProcedure,
  type ContractRouter,
  DecoratedContractProcedure,
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
import { DecoratedProcedure, type ProcedureHandler } from './procedure'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureImplementer } from './procedure-implementer'
import type { Router } from './router'
import { RouterBuilder } from './router-builder'
import {
  type ChainedRouterImplementer,
  chainRouterImplementer,
} from './router-implementer'
import type { Context, MergeContext } from './types'

export class Builder<TContext extends Context, TExtraContext extends Context> {
  constructor(
    public zz$b: {
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
      ...this.zz$b,
      middlewares: [...(this.zz$b.middlewares || []), middleware],
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
      middlewares: this.zz$b.middlewares,
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
      middlewares: this.zz$b.middlewares,
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
      middlewares: this.zz$b.middlewares,
    })
  }

  /**
   * Convert to Procedure
   */
  handler<UHandlerOutput = undefined>(
    handler: ProcedureHandler<
      TContext,
      DecoratedContractProcedure<undefined, undefined>,
      TExtraContext,
      UHandlerOutput
    >,
  ): DecoratedProcedure<
    TContext,
    DecoratedContractProcedure<undefined, undefined>,
    TExtraContext,
    UHandlerOutput
  > {
    return new DecoratedProcedure({
      middlewares: this.zz$b.middlewares,
      contract: new DecoratedContractProcedure({
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
    : UContract extends ContractRouter
      ? ChainedRouterImplementer<TContext, UContract, TExtraContext>
      : never {
    if (isContractProcedure(contract)) {
      return new ProcedureImplementer({
        contract,
        middlewares: this.zz$b.middlewares,
      }) as any
    }

    return chainRouterImplementer(
      contract as ContractRouter,
      this.zz$b.middlewares,
    ) as any
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

  prefix(prefix: HTTPPath): RouterBuilder<TContext, TExtraContext> {
    return new RouterBuilder({
      ...this.zz$b,
      prefix,
    })
  }

  /**
   * Create DecoratedRouter
   */
  router<URouter extends Router<TContext>>(router: URouter): URouter {
    return new RouterBuilder(this.zz$b).router(router)
  }
}
