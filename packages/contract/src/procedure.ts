import type { HTTPMethod, HTTPPath, Schema, SchemaOutput } from './types'

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
      ...this.zzContractProcedure,
      ...opts,
      method: opts.method,
      path: opts.path,
    })
  }

  prefix(
    prefix: HTTPPath,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    if (!this.zzContractProcedure.path) return this

    return new DecoratedContractProcedure({
      ...this.zzContractProcedure,
      path: `${prefix}${this.zzContractProcedure.path}`,
    })
  }

  summary(
    summary: string,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this.zzContractProcedure,
      summary,
    })
  }

  description(
    description: string,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this.zzContractProcedure,
      description,
    })
  }

  deprecated(
    deprecated = true,
  ): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this.zzContractProcedure,
      deprecated,
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): DecoratedContractProcedure<USchema, TOutputSchema> {
    return new DecoratedContractProcedure({
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
  ): DecoratedContractProcedure<TInputSchema, USchema> {
    return new DecoratedContractProcedure({
      ...this.zzContractProcedure,
      OutputSchema: schema,
      outputExample: example,
      outputExamples: examples,
    })
  }
}

export type WELL_DEFINED_CONTRACT_PROCEDURE = DecoratedContractProcedure<
  Schema,
  Schema
>

export function isContractProcedure(
  item: unknown,
): item is WELL_DEFINED_CONTRACT_PROCEDURE {
  if (item instanceof DecoratedContractProcedure) return true

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
