import type { ContractRouter } from './router'
import type { HTTPPath, Schema, SchemaInput, SchemaOutput } from './types'
import { DecoratedContractProcedure, type RouteOptions } from './procedure'
import { ContractRouterBuilder } from './router-builder'

export class ContractBuilder {
  prefix(prefix: HTTPPath): ContractRouterBuilder {
    return new ContractRouterBuilder({
      prefix,
    })
  }

  tags(...tags: string[]): ContractRouterBuilder {
    return new ContractRouterBuilder({
      tags,
    })
  }

  route(opts: RouteOptions): DecoratedContractProcedure<undefined, undefined> {
    return new DecoratedContractProcedure({
      InputSchema: undefined,
      OutputSchema: undefined,
      ...opts,
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaInput<USchema>,
  ): DecoratedContractProcedure<USchema, undefined> {
    return new DecoratedContractProcedure({
      InputSchema: schema,
      inputExample: example,
      OutputSchema: undefined,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
  ): DecoratedContractProcedure<undefined, USchema> {
    return new DecoratedContractProcedure({
      InputSchema: undefined,
      OutputSchema: schema,
      outputExample: example,
    })
  }

  router<T extends ContractRouter>(router: T): T {
    return router
  }
}
