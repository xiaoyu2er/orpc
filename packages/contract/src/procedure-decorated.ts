import type { ANY_CONTRACT_PROCEDURE, RouteOptions } from './procedure'
import type { HTTPPath, Schema, SchemaInput, SchemaOutput } from './types'
import { ContractProcedure } from './procedure'

export class DecoratedContractProcedure<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
> extends ContractProcedure<TInputSchema, TOutputSchema> {
  static decorate<U extends ANY_CONTRACT_PROCEDURE>(procedure: U) {
    if (procedure instanceof DecoratedContractProcedure) {
      return procedure
    }

    return new DecoratedContractProcedure(procedure['~orpc'])
  }

  route(opts: RouteOptions): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      ...opts,
    })
  }

  prefix(prefix: HTTPPath): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      path: `${prefix}${this['~orpc'].path}`,
    })
  }

  pushTags(...tags: string[]): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      tags: [...(this['~orpc'].tags ?? []), ...tags],
    })
  }

  input<U extends Schema = undefined>(schema: U, example?: SchemaInput<U>): DecoratedContractProcedure<U, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      InputSchema: schema as any,
      inputExample: example as any,
    })
  }

  output<U extends Schema = undefined>(schema: U, example?: SchemaOutput<U>): DecoratedContractProcedure<TInputSchema, U> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      OutputSchema: schema as any,
      outputExample: example as any,
    })
  }
}
