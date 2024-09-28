import {
  ContractProcedure,
  ContractRouter,
  isContractProcedure,
  Schema,
  SchemaOutput,
} from '@orpc/contract'
import {
  DecoratedMiddleware,
  decorateMiddleware,
  MapInputMiddleware,
  Middleware,
} from './middleware'
import { Procedure, ProcedureHandler } from './procedure'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureImplementer } from './procedure-implementer'
import { DecoratedRouter, decorateRouter, Router } from './router'
import { RouterImplementer } from './router-implementer'
import { Context, MergeContext } from './types'

export class Builder<TContext extends Context = any, TExtraContext extends Context = any> {
  constructor(
    public __b: {
      middlewares?: Middleware[]
    } = {}
  ) {}

  /**
   * Self chainable
   */

  context<UContext extends Context>(): Builder<UContext> {
    return this as any
  }

  use<UExtraContext extends Context>(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtraContext>
  ): Builder<TContext, MergeContext<TExtraContext, UExtraContext>>

  use<UExtraContext extends Context, UMappedInput = unknown>(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtraContext, UMappedInput>,
    mapInput: MapInputMiddleware<unknown, UMappedInput>
  ): Builder<TContext, MergeContext<TExtraContext, UExtraContext>>

  use(middleware_: Middleware, mapInput?: MapInputMiddleware): Builder {
    const middleware: Middleware =
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

  route(
    ...args: Parameters<ProcedureBuilder<TContext, TExtraContext>['route']>
  ): ProcedureBuilder<TContext, TExtraContext> {
    return new ProcedureBuilder({
      contract: new ContractProcedure().route(...args),
      middlewares: this.__b.middlewares,
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ProcedureBuilder<TContext, TExtraContext, USchema> {
    return new ProcedureBuilder({
      contract: new ContractProcedure().input(schema, example, examples),
      middlewares: this.__b.middlewares,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ProcedureBuilder<TContext, TExtraContext, Schema, USchema> {
    return new ProcedureBuilder({
      contract: new ContractProcedure().output(schema, example, examples),
      middlewares: this.__b.middlewares,
    })
  }

  /**
   * Convert to Procedure
   */
  handler<UHandlerOutput extends SchemaOutput<any>>(
    handler: ProcedureHandler<
      MergeContext<TContext, TExtraContext>,
      ContractProcedure,
      UHandlerOutput
    >
  ): Procedure<TContext, ContractProcedure, TExtraContext, UHandlerOutput> {
    return new Procedure({
      middlewares: this.__b.middlewares,
      contract: new ContractProcedure(),
      handler,
    })
  }

  /**
   * Convert to ProcedureImplementer | RouterBuilder
   */

  contract<UContract extends ContractProcedure | ContractRouter>(
    contract: UContract
  ): UContract extends ContractProcedure
    ? ProcedureImplementer<TContext, UContract, TExtraContext>
    : RouterImplementer<TContext, UContract> {
    if (isContractProcedure(contract)) {
      return new ProcedureImplementer({ contract, middlewares: this.__b.middlewares }) as any
    }

    return new RouterImplementer<TContext, typeof contract>() as any
  }

  /**
   * Create ExtendedMiddleware
   */

  middleware<UExtraContext extends Context, TInput = unknown>(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtraContext, TInput>
  ): DecoratedMiddleware<MergeContext<TContext, TExtraContext>, UExtraContext, TInput> {
    return decorateMiddleware(middleware)
  }

  /**
   * Create DecoratedRouter
   */
  router<URouter extends Router<TContext>>(router: URouter): DecoratedRouter<URouter> {
    return decorateRouter(router)
  }
}
