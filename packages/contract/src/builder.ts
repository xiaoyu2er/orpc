import { ContractProcedure } from './procedure'
import { ContractRouter, createExtendedContractRouter, ExtendedContractRouter } from './router'
import { HTTPMethod, HTTPPath, Schema, SchemaOutput } from './types'

export class ContractBuilder {
  route(opts: {
    method: HTTPMethod
    path: HTTPPath
    summary?: string
    description?: string
    deprecated?: boolean
  }): ContractProcedure {
    return new ContractProcedure(opts)
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ContractProcedure<USchema> {
    return new ContractProcedure({
      InputSchema: schema,
      inputExample: example,
      inputExamples: examples,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ContractProcedure<Schema, USchema> {
    return new ContractProcedure({
      OutputSchema: schema,
      outputExample: example,
      outputExamples: examples,
    })
  }

  router<T extends ContractRouter>(router: T): ExtendedContractRouter<ContractRouter> {
    return createExtendedContractRouter(router)
  }
}
