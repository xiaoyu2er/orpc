import type { ProcedureClient } from '@orpc/client'
import type { Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { SetOptional } from '@orpc/shared'
import type {
  DefaultError,
  OmitKeyof,
  QueriesPlaceholderDataFunction,
  QueryKey,
  UseQueryOptions,
} from '@tanstack/react-query'
import { getQueryKeyFromPath } from '../tanstack-key'

type UseQueryOptionsForUseQueries<
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = OmitKeyof<
  UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  'placeholderData'
> & {
  placeholderData?: TQueryFnData | QueriesPlaceholderDataFunction<TQueryFnData>
}

export interface UseQueriesBuilder<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaOutput<TOutputSchema>,
> {
  (
    input: SchemaInput<TInputSchema>,
    options?: SetOptional<
      UseQueryOptionsForUseQueries<SchemaOutput<TOutputSchema, TFuncOutput>>,
      'queryFn' | 'queryKey'
    >,
  ): UseQueryOptionsForUseQueries<SchemaOutput<TOutputSchema, TFuncOutput>>
}

export interface CreateUseQueriesBuilderOptions<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaOutput<TOutputSchema>,
> {
  client: ProcedureClient<TInputSchema, TOutputSchema, TFuncOutput>

  /**
   * The path of procedure on server
   */
  path: string[]
}

export function createUseQueriesBuilder<
  TInputSchema extends Schema = undefined,
  TOutputSchema extends Schema = undefined,
  TFuncOutput extends
  SchemaOutput<TOutputSchema> = SchemaOutput<TOutputSchema>,
>(
  options: CreateUseQueriesBuilderOptions<
    TInputSchema,
    TOutputSchema,
    TFuncOutput
  >,
): UseQueriesBuilder<TInputSchema, TOutputSchema, TFuncOutput> {
  return (input, options_) => {
    return {
      queryKey: getQueryKeyFromPath(options.path, { input, type: 'query' }),
      queryFn: ({ signal }) => options.client(input, { signal }),
      ...options_,
    }
  }
}
