import { ContractProcedure } from './procedure'
import { ContractRouter, decorateContractRouter, DecoratedContractRouter } from './router'
import { Schema, SchemaOutput } from './types'

export class ContractBuilder {
  route(
    ...args: Parameters<ContractProcedure<undefined, undefined>['route']>
  ): ContractProcedure<undefined, undefined> {
    return new ContractProcedure(...args)
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ContractProcedure<USchema, undefined> {
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
  ): ContractProcedure<undefined, USchema> {
    return new ContractProcedure({
      OutputSchema: schema,
      outputExample: example,
      outputExamples: examples,
    })
  }

  router<T extends ContractRouter<any>>(router: T): DecoratedContractRouter<T> {
    return decorateContractRouter(router)
  }
}
