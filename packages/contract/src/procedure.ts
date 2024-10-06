import type { HTTPMethod, HTTPPath, Schema, SchemaOutput } from './types'

export class ContractProcedure<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
> {
  constructor(
    public zz$cp: {
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
}

export class DecoratedContractProcedure<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
> extends ContractProcedure<TInputSchema, TOutputSchema> {
  route(opts: {
    method?: HTTPMethod
    path?: HTTPPath
    summary?: string
    description?: string
    deprecated?: boolean
  }): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this.zz$cp,
      ...opts,
      method: opts.method,
      path: opts.path,
    })
  }

  prefix(
    prefix: HTTPPath,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    if (!this.zz$cp.path) return this

    return new DecoratedContractProcedure({
      ...this.zz$cp,
      path: `${prefix}${this.zz$cp.path}`,
    })
  }

  summary(
    summary: string,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this.zz$cp,
      summary,
    })
  }

  description(
    description: string,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this.zz$cp,
      description,
    })
  }

  deprecated(
    deprecated = true,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this.zz$cp,
      deprecated,
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): DecoratedContractProcedure<USchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this.zz$cp,
      InputSchema: schema,
      inputExample: example,
      inputExamples: examples,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): DecoratedContractProcedure<TInputSchema, USchema> {
    return new DecoratedContractProcedure({
      ...this.zz$cp,
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
    return typeof anyItem.zz$cp === 'object' && anyItem.zz$cp !== null
  } catch {
    return false
  }
}
