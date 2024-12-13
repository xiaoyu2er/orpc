import type {
  HTTPMethod,
  HTTPPath,
  Schema,
  SchemaOutput,
} from './types'

export interface RouteOptions {
  method?: HTTPMethod
  path?: HTTPPath
  summary?: string
  description?: string
  deprecated?: boolean
  tags?: string[]
}

export interface ContractProcedureDef<TInputSchema extends Schema, TOutputSchema extends Schema> extends RouteOptions {
  InputSchema?: TInputSchema
  inputExample?: SchemaOutput<TInputSchema>
  OutputSchema?: TOutputSchema
  outputExample?: SchemaOutput<TOutputSchema>
}

export class ContractProcedure<TInputSchema extends Schema, TOutputSchema extends Schema> {
  '~type' = 'ContractProcedure' as const
  '~orpc': ContractProcedureDef<TInputSchema, TOutputSchema>

  constructor(def: ContractProcedureDef<TInputSchema, TOutputSchema>) {
    this['~orpc'] = def
  }
}

export type ANY_CONTRACT_PROCEDURE = ContractProcedure<any, any>
export type WELL_CONTRACT_PROCEDURE = ContractProcedure<Schema, Schema>

export function isContractProcedure(item: unknown): item is ANY_CONTRACT_PROCEDURE {
  return item instanceof ContractProcedure
}
