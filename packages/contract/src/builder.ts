import { ContractRoute } from './route'
import { ContractRouter, createExtendedContractRouter, ExtendedContractRouter } from './router'
import { HTTPMethod, HTTPPath, Schema, SchemaOutput } from './types'

export class ContractBuilder {
  route(opts: {
    method: HTTPMethod
    path: HTTPPath
    summary?: string
    description?: string
    deprecated?: boolean
  }): ContractRoute {
    return new ContractRoute(opts)
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ContractRoute<USchema> {
    return new ContractRoute({
      InputSchema: schema,
      inputExample: example,
      inputExamples: examples,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ContractRoute<Schema, USchema> {
    return new ContractRoute({
      OutputSchema: schema,
      outputExample: example,
      outputExamples: examples,
    })
  }

  router<T extends ContractRouter>(router: T): ExtendedContractRouter<ContractRouter> {
    return createExtendedContractRouter(router)
  }
}
