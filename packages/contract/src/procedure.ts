import type { HTTPMethod, HTTPPath, Schema, SchemaOutput } from './types'
import { prefixHTTPPath } from './utils'

export class ContractProcedure<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
> {
  constructor(
    public zzContractProcedure: {
      path?: HTTPPath
      method?: HTTPMethod
      summary?: string
      description?: string
      deprecated?: boolean
      InputSchema: TInputSchema
      inputExample?: SchemaOutput<TInputSchema>
      inputExamples?: Record<string, SchemaOutput<TInputSchema>>
      OutputSchema: TOutputSchema
      outputExample?: SchemaOutput<TOutputSchema>
      outputExamples?: Record<string, SchemaOutput<TOutputSchema>>
    },
  ) {}

  route(opts: {
    method?: HTTPMethod
    path?: HTTPPath
    summary?: string
    description?: string
    deprecated?: boolean
  }): ContractProcedure<TInputSchema, TOutputSchema> {
    return new ContractProcedure({
      ...this.zzContractProcedure,
      ...opts,
      method: opts.method,
      path: opts.path,
    })
  }

  prefix(prefix: HTTPPath): ContractProcedure<TInputSchema, TOutputSchema> {
    return new ContractProcedure({
      ...this.zzContractProcedure,
      path: this.zzContractProcedure.path
        ? prefixHTTPPath(prefix, this.zzContractProcedure.path)
        : this.zzContractProcedure.path,
    })
  }

  summary(summary: string): ContractProcedure<TInputSchema, TOutputSchema> {
    return new ContractProcedure({ ...this.zzContractProcedure, summary })
  }

  description(
    description: string,
  ): ContractProcedure<TInputSchema, TOutputSchema> {
    return new ContractProcedure({ ...this.zzContractProcedure, description })
  }

  deprecated(
    deprecated = true,
  ): ContractProcedure<TInputSchema, TOutputSchema> {
    return new ContractProcedure({ ...this.zzContractProcedure, deprecated })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): ContractProcedure<USchema, TOutputSchema> {
    return new ContractProcedure({
      ...this.zzContractProcedure,
      InputSchema: schema,
      inputExample: example,
      inputExamples: examples,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): ContractProcedure<TInputSchema, USchema> {
    return new ContractProcedure({
      ...this.zzContractProcedure,
      OutputSchema: schema,
      outputExample: example,
      outputExamples: examples,
    })
  }
}

export type WELL_DEFINED_CONTRACT_PROCEDURE = ContractProcedure<Schema, Schema>

export function isContractProcedure(
  item: unknown,
): item is WELL_DEFINED_CONTRACT_PROCEDURE {
  if (item instanceof ContractProcedure) return true

  try {
    const anyItem = item as any
    return (
      typeof anyItem.zzContractProcedure === 'object' &&
      anyItem.zzContractProcedure !== null
    )
  } catch {
    return false
  }
}
