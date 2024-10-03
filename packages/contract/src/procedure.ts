import type {
  HTTPMethod,
  HTTPPath,
  PrefixHTTPPath,
  Schema,
  SchemaOutput,
} from './types'
import { prefixHTTPPath } from './utils'

export class ContractProcedure<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TMethod extends HTTPMethod,
  TPath extends HTTPPath,
> {
  constructor(
    public __cp: {
      path?: TPath
      method?: TMethod
      summary?: string
      description?: string
      deprecated?: boolean
      InputSchema?: TInputSchema
      inputExample?: SchemaOutput<TInputSchema>
      inputExamples?: Record<string, SchemaOutput<TInputSchema>>
      OutputSchema?: TOutputSchema
      outputExample?: SchemaOutput<TOutputSchema>
      outputExamples?: Record<string, SchemaOutput<TOutputSchema>>
    } = {},
  ) {}

  route<
    UMethod extends HTTPMethod = undefined,
    UPath extends HTTPPath = undefined,
  >(opts: {
    method?: UMethod
    path?: UPath
    summary?: string
    description?: string
    deprecated?: boolean
  }): ContractProcedure<TInputSchema, TOutputSchema, UMethod, UPath> {
    return new ContractProcedure({
      ...this.__cp,
      ...opts,
      method: opts.method,
      path: opts.path,
    })
  }

  prefix<TPrefix extends Exclude<HTTPPath, undefined>>(
    prefix: TPrefix,
  ): ContractProcedure<
    TInputSchema,
    TOutputSchema,
    TMethod,
    PrefixHTTPPath<TPrefix, TPath>
  > {
    return new ContractProcedure({
      ...this.__cp,
      path: prefixHTTPPath(prefix, this.__cp.path),
    })
  }

  summary(
    summary: string,
  ): ContractProcedure<TInputSchema, TOutputSchema, TMethod, TPath> {
    return new ContractProcedure({ ...this.__cp, summary })
  }

  description(
    description: string,
  ): ContractProcedure<TInputSchema, TOutputSchema, TMethod, TPath> {
    return new ContractProcedure({ ...this.__cp, description })
  }

  deprecated(
    deprecated = true,
  ): ContractProcedure<TInputSchema, TOutputSchema, TMethod, TPath> {
    return new ContractProcedure({ ...this.__cp, deprecated })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): ContractProcedure<USchema, TOutputSchema, TMethod, TPath> {
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
    examples?: Record<string, SchemaOutput<USchema>>,
  ): ContractProcedure<TInputSchema, USchema, TMethod, TPath> {
    return new ContractProcedure({
      ...this.__cp,
      OutputSchema: schema,
      outputExample: example,
      outputExamples: examples,
    })
  }
}

export type WELL_DEFINED_CONTRACT_PROCEDURE = ContractProcedure<
  Schema,
  Schema,
  HTTPMethod,
  HTTPPath
>

export function isContractProcedure(
  item: unknown,
): item is WELL_DEFINED_CONTRACT_PROCEDURE {
  if (item instanceof ContractProcedure) return true

  try {
    const anyItem = item as any
    return typeof anyItem.__cp === 'object' && anyItem.__cp !== null
  } catch {
    return false
  }
}
