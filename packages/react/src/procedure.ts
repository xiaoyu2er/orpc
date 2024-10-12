import type { Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import {
  type OmitKeyof,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import { type ORPCContext, useORPCContext } from './context'
import { get } from './utils'

export type ProcedureReactClient<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaOutput<TOutputSchema>,
> = {
  useQuery: (
    input: SchemaInput<TInputSchema>,
    options?: OmitKeyof<
      UseQueryOptions<
        SchemaOutput<TOutputSchema, THandlerOutput>,
        unknown,
        SchemaOutput<TOutputSchema, THandlerOutput>,
        QueryKey
      >,
      'queryKey' | 'queryFn'
    >,
  ) => UseQueryResult<SchemaOutput<TOutputSchema, THandlerOutput>, unknown>

  useMutation: (
    options?: OmitKeyof<
      UseMutationOptions<
        SchemaOutput<TOutputSchema, THandlerOutput>,
        unknown,
        SchemaInput<TInputSchema>
      >,
      'mutationFn'
    >,
  ) => UseMutationResult<
    SchemaOutput<TOutputSchema, THandlerOutput>,
    unknown,
    SchemaInput<TInputSchema>
  >
}

export interface CreateProcedureReactClientOptions {
  /**
   * The custom orpc context, helpful when use has many orpc context.
   *
   * @default defaultORPCContext
   */
  context?: ORPCContext

  /**
   * The path of the procedure on server.
   */
  path: string[]
}

export function createProcedureReactClient<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaOutput<TOutputSchema>,
>(
  options: CreateProcedureReactClientOptions,
): ProcedureReactClient<TInputSchema, TOutputSchema, THandlerOutput> {
  return {
    useQuery: (input, options_) => {
      const orpc = useORPCContext(options.context)
      const query = useQuery(
        {
          ...options_,
          queryFn: () => (get(orpc.client, options.path) as any)(input),
          queryKey: [...options.path, input],
        },
        orpc.queryClient,
      )

      return query
    },

    useMutation: (options_) => {
      const orpc = useORPCContext(options.context)

      const mutation = useMutation(
        {
          ...options_,
          mutationFn: (input) => (get(orpc.client, options.path) as any)(input),
        },
        orpc.queryClient,
      )

      return mutation
    },
  }
}
