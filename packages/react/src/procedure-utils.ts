import type { ProcedureClient } from '@orpc/client'
import type { Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { PartialOnUndefinedDeep, SetOptional } from '@orpc/shared'
import type {
  DefaultError,
  EnsureInfiniteQueryDataOptions,
  EnsureQueryDataOptions,
  FetchInfiniteQueryOptions,
  FetchQueryOptions,
  InfiniteData,
  QueryClient,
  QueryKey,
  QueryState,
  SetDataOptions,
  Updater,
} from '@tanstack/react-query'
import type { SchemaInputForInfiniteQuery } from './types'
import { getQueryKeyFromPath } from './tanstack-key'

export interface ProcedureUtils<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaOutput<TOutputSchema>,
> {
  fetchQuery: (
    input: SchemaInput<TInputSchema>,
    options?: SetOptional<
      FetchQueryOptions<SchemaOutput<TOutputSchema, TFuncOutput>>,
      'queryKey' | 'queryFn'
    >,
  ) => Promise<SchemaOutput<TOutputSchema, TFuncOutput>>
  fetchInfiniteQuery: (
    options: PartialOnUndefinedDeep<
      SetOptional<
        FetchInfiniteQueryOptions<
          SchemaOutput<TOutputSchema, TFuncOutput>,
          DefaultError,
          SchemaOutput<TOutputSchema, TFuncOutput>,
          QueryKey,
          SchemaInput<TInputSchema>['cursor']
        >,
        'queryKey' | 'queryFn'
      > & {
        input: SchemaInputForInfiniteQuery<TInputSchema>
      }
    >,
  ) => Promise<
    InfiniteData<
      SchemaOutput<TOutputSchema, TFuncOutput>,
      SchemaInput<TInputSchema>['cursor']
    >
  >

  prefetchQuery: (
    input: SchemaInput<TInputSchema>,
    options?: SetOptional<
      FetchQueryOptions<SchemaOutput<TOutputSchema, TFuncOutput>>,
      'queryKey' | 'queryFn'
    >,
  ) => Promise<void>
  prefetchInfiniteQuery: (
    options: PartialOnUndefinedDeep<
      SetOptional<
        FetchInfiniteQueryOptions<
          SchemaOutput<TOutputSchema, TFuncOutput>,
          DefaultError,
          SchemaOutput<TOutputSchema, TFuncOutput>,
          QueryKey,
          SchemaInput<TInputSchema>['cursor']
        >,
        'queryKey' | 'queryFn'
      > & {
        input: SchemaInputForInfiniteQuery<TInputSchema>
      }
    >,
  ) => Promise<void>

  getQueryData: (
    input: SchemaInput<TInputSchema>,
  ) => SchemaOutput<TOutputSchema, TFuncOutput> | undefined
  getInfiniteQueryData: (
    input: SchemaInputForInfiniteQuery<TInputSchema>,
  ) => | InfiniteData<
    SchemaOutput<TOutputSchema, TFuncOutput>,
    SchemaInput<TInputSchema>['cursor']
  >
  | undefined

  ensureQueryData: (
    input: SchemaInput<TInputSchema>,
    options?: SetOptional<
      EnsureQueryDataOptions<SchemaOutput<TOutputSchema, TFuncOutput>>,
      'queryFn' | 'queryKey'
    >,
  ) => Promise<SchemaOutput<TOutputSchema, TFuncOutput>>
  ensureInfiniteQueryData: (
    options: PartialOnUndefinedDeep<
      SetOptional<
        EnsureInfiniteQueryDataOptions<
          SchemaOutput<TOutputSchema, TFuncOutput>,
          DefaultError,
          SchemaOutput<TOutputSchema, TFuncOutput>,
          QueryKey,
          SchemaInput<TInputSchema>['cursor']
        >,
        'queryKey' | 'queryFn'
      > & {
        input: SchemaInputForInfiniteQuery<TInputSchema>
      }
    >,
  ) => Promise<
    InfiniteData<
      SchemaOutput<TOutputSchema, TFuncOutput>,
      SchemaInput<TInputSchema>['cursor']
    >
  >

  getQueryState: (
    input: SchemaInput<TInputSchema>,
  ) => QueryState<SchemaOutput<TOutputSchema, TFuncOutput>> | undefined
  getInfiniteQueryState: (
    input: SchemaInputForInfiniteQuery<TInputSchema>,
  ) => | QueryState<
    InfiniteData<
      SchemaOutput<TOutputSchema, TFuncOutput>,
      SchemaInput<TInputSchema>['cursor']
    >
  >
  | undefined

  setQueryData: (
    input: SchemaInput<TInputSchema>,
    updater: Updater<
      SchemaOutput<TOutputSchema, TFuncOutput> | undefined,
      SchemaOutput<TOutputSchema, TFuncOutput> | undefined
    >,
    options?: SetDataOptions,
  ) => SchemaOutput<TOutputSchema, TFuncOutput> | undefined
  setInfiniteQueryData: (
    input: SchemaInputForInfiniteQuery<TInputSchema>,
    updater: Updater<
      | InfiniteData<
        SchemaOutput<TOutputSchema, TFuncOutput>,
        SchemaInput<TInputSchema>['cursor']
      >
      | undefined,
      | InfiniteData<
        SchemaOutput<TOutputSchema, TFuncOutput>,
        SchemaInput<TInputSchema>['cursor']
      >
      | undefined
    >,
    options?: SetDataOptions,
  ) => | InfiniteData<
    SchemaOutput<TOutputSchema, TFuncOutput>,
    SchemaInput<TInputSchema>['cursor']
  >
  | undefined
}

export interface CreateProcedureUtilsOptions<
  TInputSchema extends Schema = undefined,
  TOutputSchema extends Schema = undefined,
  TFuncOutput extends
  SchemaOutput<TOutputSchema> = SchemaOutput<TOutputSchema>,
> {
  client: ProcedureClient<TInputSchema, TOutputSchema, TFuncOutput>
  queryClient: QueryClient

  /**
   * The path of procedure on sever
   */
  path: string[]
}

export function createProcedureUtils<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaOutput<TOutputSchema>,
>(
  options: CreateProcedureUtilsOptions<
    TInputSchema,
    TOutputSchema,
    TFuncOutput
  >,
): ProcedureUtils<TInputSchema, TOutputSchema, TFuncOutput> {
  return {
    fetchQuery(input, options_) {
      return options.queryClient.fetchQuery({
        queryKey: getQueryKeyFromPath(options.path, { input, type: 'query' }),
        queryFn: ({ signal }) => options.client(input, { signal }),
        ...options_,
      })
    },
    fetchInfiniteQuery(options_) {
      const { input, ...rest } = options_
      return options.queryClient.fetchInfiniteQuery({
        queryKey: getQueryKeyFromPath(options.path, {
          input,
          type: 'infinite',
        }),
        queryFn: ({ pageParam, signal }) => {
          return options.client({ ...(input as any), pageParam } as any, { signal })
        },
        ...(rest as any),
      })
    },

    prefetchQuery(input, options_) {
      return options.queryClient.prefetchQuery({
        queryKey: getQueryKeyFromPath(options.path, {
          input,
          type: 'query',
        }),
        queryFn: ({ signal }) => options.client(input, { signal }),
        ...options_,
      })
    },
    prefetchInfiniteQuery(options_) {
      const { input, ...rest } = options_
      return options.queryClient.prefetchInfiniteQuery({
        queryKey: getQueryKeyFromPath(options.path, {
          input,
          type: 'infinite',
        }),
        queryFn: ({ pageParam, signal }) => {
          return options.client({ ...(input as any), cursor: pageParam } as any, { signal })
        },
        ...(rest as any),
      })
    },

    getQueryData(input) {
      return options.queryClient.getQueryData(
        getQueryKeyFromPath(options.path, {
          input,
          type: 'query',
        }),
      )
    },
    getInfiniteQueryData(input) {
      return options.queryClient.getQueryData(
        getQueryKeyFromPath(options.path, {
          input,
          type: 'infinite',
        }),
      )
    },

    ensureQueryData(input, options_) {
      return options.queryClient.ensureQueryData({
        queryKey: getQueryKeyFromPath(options.path, {
          input,
          type: 'query',
        }),
        queryFn: ({ signal }) => options.client(input, { signal }),
        ...options_,
      })
    },
    ensureInfiniteQueryData(options_) {
      const { input, ...rest } = options_
      return options.queryClient.ensureInfiniteQueryData({
        queryKey: getQueryKeyFromPath(options.path, {
          input,
          type: 'infinite',
        }),
        queryFn: ({ pageParam, signal }) => {
          return options.client({ ...(input as any), pageParam } as any, { signal })
        },
        ...(rest as any),
      })
    },

    getQueryState(input) {
      return options.queryClient.getQueryState(
        getQueryKeyFromPath(options.path, {
          input,
          type: 'query',
        }),
      )
    },
    getInfiniteQueryState(input) {
      return options.queryClient.getQueryState(
        getQueryKeyFromPath(options.path, {
          input,
          type: 'infinite',
        }),
      )
    },

    setQueryData(input, updater, options_) {
      return options.queryClient.setQueryData(
        getQueryKeyFromPath(options.path, {
          input,
          type: 'query',
        }),
        updater,
        options_,
      )
    },
    setInfiniteQueryData(input, updater, options_) {
      return options.queryClient.setQueryData(
        getQueryKeyFromPath(options.path, {
          input,
          type: 'infinite',
        }),
        updater,
        options_,
      )
    },
  }
}
