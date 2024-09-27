import { HTTPMethod, HTTPPath, Schema, SchemaOutput } from './types'
import { prefixHTTPPath } from './utils'

export class ContractProcedure<
  TInputSchema extends Schema = any,
  TOutputSchema extends Schema = any
> {
  constructor(
    public __cp: {
      path?: HTTPPath
      method?: HTTPMethod
      summary?: string
      description?: string
      deprecated?: boolean
      InputSchema?: TInputSchema
      inputExample?: SchemaOutput<TInputSchema>
      inputExamples?: Record<string, SchemaOutput<TInputSchema>>
      OutputSchema?: TOutputSchema
      outputExample?: SchemaOutput<TOutputSchema>
      outputExamples?: Record<string, SchemaOutput<TOutputSchema>>
    } = {}
  ) {}

  route(opts: {
    method: HTTPMethod
    path: HTTPPath
    summary?: string
    description?: string
    deprecated?: boolean
  }): ContractProcedure<TInputSchema, TOutputSchema> {
    return new ContractProcedure({
      ...this.__cp,
      ...opts,
    })
  }

  prefix<TPrefix extends HTTPPath>(
    prefix: TPrefix
  ): ContractProcedure<TInputSchema, TOutputSchema> {
    if (this.__cp.path) {
      return new ContractProcedure({
        ...this.__cp,
        path: prefixHTTPPath(prefix, this.__cp.path),
      })
    }

    return this
  }

  summary(summary: string): ContractProcedure<TInputSchema, TOutputSchema> {
    return new ContractProcedure({ ...this.__cp, summary })
  }

  description(description: string): ContractProcedure<TInputSchema, TOutputSchema> {
    return new ContractProcedure({ ...this.__cp, description })
  }

  deprecated(deprecated: boolean = true): ContractProcedure<TInputSchema, TOutputSchema> {
    return new ContractProcedure({ ...this.__cp, deprecated })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ContractProcedure<USchema, TOutputSchema> {
    return new ContractProcedure({
      ...this.__cp,
      InputSchema: schema,
      inputExample: example,
      inputExamples: examples,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ContractProcedure<TInputSchema, USchema> {
    return new ContractProcedure({
      ...this.__cp,
      OutputSchema: schema,
      outputExample: example,
      outputExamples: examples,
    })
  }
}

export function isContractProcedure(item: unknown): item is ContractProcedure {
  if (item instanceof ContractProcedure) return true

  try {
    const anyItem = item as any
    return typeof anyItem.__cp.path === 'string' && typeof anyItem.__cp.method === 'string'
  } catch {
    return false
  }
}
