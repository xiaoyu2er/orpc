import { ContractProcedure } from './procedure'
import {
  type ContractRouter,
  type DecoratedContractRouter,
  decorateContractRouter,
} from './router'
import type { HTTPMethod, HTTPPath, Schema, SchemaOutput } from './types'

export class ContractBuilder {
  route(opts: {
    method?: HTTPMethod
    path?: HTTPPath
    summary?: string
    description?: string
    deprecated?: boolean
  }): ContractProcedure<undefined, undefined> {
    return new ContractProcedure({
      InputSchema: undefined,
      OutputSchema: undefined,
      ...opts,
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): ContractProcedure<USchema, undefined> {
    return new ContractProcedure({
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
  ): ContractProcedure<undefined, USchema> {
    return new ContractProcedure({
      InputSchema: undefined,
      OutputSchema: schema,
      outputExample: example,
      outputExamples: examples,
    })
  }

  router<T extends ContractRouter<any>>(router: T): DecoratedContractRouter<T> {
    return decorateContractRouter(router)
  }
}
