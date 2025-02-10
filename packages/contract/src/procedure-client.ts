import type { Client, ClientContext } from './client'
import type { ErrorFromErrorMap } from './error'
import type { ErrorMap } from './error-map'
import type { Schema, SchemaInput, SchemaOutput } from './schema'

export type ContractProcedureClient<
  TClientContext extends ClientContext,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> = Client<TClientContext, SchemaInput<TInputSchema>, SchemaOutput<TOutputSchema>, ErrorFromErrorMap<TErrorMap>>
