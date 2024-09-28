import { ContractProcedure } from './procedure'
import { ContractRouter, decorateContractRouter, DecoratedContractRouter } from './router'
import { Schema, SchemaOutput } from './types'

export class ContractBuilder {
  route(...args: Parameters<ContractProcedure['route']>): ContractProcedure {
    return new ContractProcedure(...args)
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

  router<T extends ContractRouter>(router: T): DecoratedContractRouter<ContractRouter> {
    return decorateContractRouter(router)
  }
}
