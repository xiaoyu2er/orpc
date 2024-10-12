import type { Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import {
  type InfiniteData,
  type OmitKeyof,
  type QueryKey,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
  useInfiniteQuery,
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

  useInfiniteQuery: (
    input: Omit<SchemaInput<TInputSchema>, 'cursor'> &
      Record<string | number | symbol, any>,
    options: OmitKeyof<
      UseInfiniteQueryOptions<
        SchemaOutput<TOutputSchema, THandlerOutput>,
        unknown,
        InfiniteData<SchemaOutput<TOutputSchema, THandlerOutput>>,
        SchemaOutput<TOutputSchema, THandlerOutput>,
        QueryKey,
        SchemaInput<TInputSchema>['cursor']
      >,
      'queryFn' | 'queryKey'
    >,
  ) => UseInfiniteQueryResult<
    InfiniteData<SchemaOutput<TOutputSchema, THandlerOutput>>,
    unknown
  >

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

    useInfiniteQuery(input, options_) {
      const orpc = useORPCContext(options.context)

      const query = useInfiniteQuery({
        ...options_,
        queryFn: ({ pageParam }) =>
          (get(orpc.client, options.path) as any)({
            ...input,
            cursor: pageParam,
          }),
        queryKey: [...options.path, input],
      })

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
