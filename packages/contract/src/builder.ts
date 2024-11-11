import { DecoratedContractProcedure, type RouteOptions } from './procedure'
import type { ContractRouter } from './router'
import { ContractRouterBuilder } from './router-builder'
import type { HTTPPath, Schema, SchemaInput, SchemaOutput } from './types'

export class ContractBuilder {
  prefix(prefix: HTTPPath): ContractRouterBuilder {
    return new ContractRouterBuilder({
      prefix: prefix,
    })
  }

  tags(...tags: string[]): ContractRouterBuilder {
    return new ContractRouterBuilder({
      tags: tags,
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
    examples?: Record<string, SchemaInput<USchema>>,
  ): DecoratedContractProcedure<USchema, undefined> {
    return new DecoratedContractProcedure({
      InputSchema: schema,
      inputExample: example,
      inputExamples: examples,
      OutputSchema: undefined,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): DecoratedContractProcedure<undefined, USchema> {
    return new DecoratedContractProcedure({
      InputSchema: undefined,
      OutputSchema: schema,
      outputExample: example,
      outputExamples: examples,
    })
  }

  router<T extends ContractRouter>(router: T): T {
    return router
  }
}
