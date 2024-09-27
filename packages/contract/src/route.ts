import { HTTPMethod, HTTPPath, Schema, SchemaOutput } from './types'
import { prefixHTTPPath } from './utils'

export class ContractRoute<TInputSchema extends Schema = any, TOutputSchema extends Schema = any> {
  constructor(
    public __cr: {
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
  }): ContractRoute<TInputSchema, TOutputSchema> {
    return new ContractRoute({
      ...this.__cr,
      ...opts,
    })
  }

  prefix<TPrefix extends HTTPPath>(prefix: TPrefix): ContractRoute<TInputSchema, TOutputSchema> {
    if (this.__cr.path) {
      return new ContractRoute({
        ...this.__cr,
        path: prefixHTTPPath(prefix, this.__cr.path),
      })
    }

    return this
  }

  summary(summary: string): ContractRoute<TInputSchema, TOutputSchema> {
    return new ContractRoute({ ...this.__cr, summary })
  }

  description(description: string): ContractRoute<TInputSchema, TOutputSchema> {
    return new ContractRoute({ ...this.__cr, description })
  }

  deprecated(deprecated: boolean = true): ContractRoute<TInputSchema, TOutputSchema> {
    return new ContractRoute({ ...this.__cr, deprecated })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ContractRoute<USchema, TOutputSchema> {
    return new ContractRoute({
      ...this.__cr,
      InputSchema: schema,
      inputExample: example,
      inputExamples: examples,
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ContractRoute<TInputSchema, USchema> {
    return new ContractRoute({
      ...this.__cr,
      OutputSchema: schema,
      outputExample: example,
      outputExamples: examples,
    })
  }
}

export function isContractRoute(item: unknown): item is ContractRoute {
  if (item instanceof ContractRoute) return true

  try {
    const anyItem = item as any
    return typeof anyItem.__cr.path === 'string' && typeof anyItem.__cr.method === 'string'
  } catch {
    return false
  }
}
