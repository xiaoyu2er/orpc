import type { PartialDeep, SetOptional } from '@orpc/shared'
import type {
  CancelOptions,
  DefaultError,
  InfiniteData,
  InvalidateOptions,
  MutationFilters,
  MutationObserverOptions,
  OmitKeyof,
  QueryClient,
  QueryKey,
  QueryObserverOptions,
  RefetchOptions,
  ResetOptions,
  SetDataOptions,
  Updater,
} from '@tanstack/react-query'
import type {
  ORPCInvalidateQueryFilters,
  ORPCQueryFilters,
} from './tanstack-query'
import type { InferCursor, SchemaInputForInfiniteQuery } from './types'
import { getMutationKeyFromPath, getQueryKeyFromPath } from './tanstack-key'

export interface GeneralUtils<TInput, TOutput> {
  getQueriesData: (
    filters?: OmitKeyof<
      ORPCQueryFilters<PartialDeep<TInput>>,
      'queryType'
    >,
  ) => [QueryKey, TOutput | undefined][]
  getInfiniteQueriesData: (
    filters?: OmitKeyof<
      ORPCQueryFilters<PartialDeep<SchemaInputForInfiniteQuery<TInput>>>,
      'queryType'
    >,
  ) => [
    QueryKey,
    | undefined
    | InfiniteData<
      TOutput,
      InferCursor<TInput>
    >,
  ][]

  setQueriesData: (
    filters: OmitKeyof<
      ORPCQueryFilters<PartialDeep<TInput>>,
      'queryType'
    >,
    updater: Updater<
      TOutput | undefined,
      TOutput | undefined
    >,
    options?: SetDataOptions,
  ) => [QueryKey, TOutput | undefined][]
  setInfiniteQueriesData: (
    filters: OmitKeyof<
      ORPCQueryFilters<PartialDeep<SchemaInputForInfiniteQuery<TInput>>>,
      'queryType'
    >,
    updater: Updater<
      | InfiniteData<
        TOutput,
        InferCursor<TInput>
      >
      | undefined,
      | InfiniteData<
        TOutput,
        InferCursor<TInput>
      >
      | undefined
    >,
    options?: SetDataOptions,
  ) => [
    QueryKey,
    | undefined
    | InfiniteData<
      TOutput,
      InferCursor<TInput>
    >,
  ][]

  invalidate: (
    filters?: ORPCInvalidateQueryFilters<
      PartialDeep<TInput>
    >,
    options?: InvalidateOptions,
  ) => Promise<void>
  refetch: (
    filters?: ORPCQueryFilters<PartialDeep<TInput>>,
    options?: RefetchOptions,
  ) => Promise<void>
  cancel: (
    filters?: ORPCQueryFilters<PartialDeep<TInput>>,
    options?: CancelOptions,
  ) => Promise<void>
  remove: (
    filters?: ORPCQueryFilters<PartialDeep<TInput>>,
  ) => void
  reset: (
    filters?: ORPCQueryFilters<PartialDeep<TInput>>,
    options?: ResetOptions,
  ) => Promise<void>

  isFetching: (
    filters?: ORPCQueryFilters<PartialDeep<TInput>>,
  ) => number
  isMutating: (filters?: SetOptional<MutationFilters, 'mutationKey'>) => number

  getQueryDefaults: (
    filters?: Pick<
      ORPCQueryFilters<PartialDeep<TInput>>,
      'input' | 'queryKey'
    >,
  ) => OmitKeyof<
    QueryObserverOptions<TOutput>,
    'queryKey'
  >
  getInfiniteQueryDefaults: (
    filters?: Pick<
      ORPCQueryFilters<PartialDeep<SchemaInputForInfiniteQuery<TInput>>>,
      'input' | 'queryKey'
    >,
  ) => OmitKeyof<
    QueryObserverOptions<
      TOutput,
      DefaultError,
      TOutput,
      InfiniteData<TOutput>,
      QueryKey,
      InferCursor<TInput>
    >,
    'queryKey'
  >

  setQueryDefaults: (
    options: Partial<
      OmitKeyof<
        QueryObserverOptions<TOutput>,
        'queryKey'
      >
    >,
    filters?: Pick<
      ORPCQueryFilters<PartialDeep<TInput>>,
      'input' | 'queryKey'
    >,
  ) => void
  setInfiniteQueryDefaults: (
    options: Partial<
      OmitKeyof<
        QueryObserverOptions<
          TOutput,
          DefaultError,
          TOutput,
          InfiniteData<TOutput>,
          QueryKey,
          InferCursor<TInput>
        >,
        'queryKey'
      >
    >,
    filters?: Pick<
      ORPCQueryFilters<PartialDeep<TInput>>,
      'input' | 'queryKey'
    >,
  ) => void

  getMutationDefaults: (
    filters?: Pick<MutationFilters, 'mutationKey'>,
  ) => MutationObserverOptions<
    TOutput,
    DefaultError,
    TInput
  >
  setMutationDefaults: (
    options: OmitKeyof<
      MutationObserverOptions<
        TOutput,
        DefaultError,
        TInput
      >,
      'mutationKey'
    >,
    filters?: Pick<MutationFilters, 'mutationKey'>,
  ) => void
}

export interface CreateGeneralUtilsOptions {
  queryClient: QueryClient

  /**
   * The path of the router or procedure on server.
   *
   * @internal
   */
  path: string[]
}

export function createGeneralUtils<TInput, TOutput>(
  options: CreateGeneralUtilsOptions,
): GeneralUtils<TInput, TOutput> {
  return {
    getQueriesData(filters) {
      const { input, ...rest } = filters ?? {}
      return options.queryClient.getQueriesData({
        queryKey: getQueryKeyFromPath(options.path, { input, type: 'query' }),
        ...rest,
      }) as any
    },
    getInfiniteQueriesData(filters) {
      const { input, ...rest } = filters ?? {}
      return options.queryClient.getQueriesData({
        queryKey: getQueryKeyFromPath(options.path, {
          input,
          type: 'infinite',
        }),
        ...rest,
      }) as any
    },

    setQueriesData(filters, updater, options_) {
      const { input, ...rest } = filters
      return options.queryClient.setQueriesData(
        {
          queryKey: getQueryKeyFromPath(options.path, {
            input,
            type: 'query',
          }),
          ...rest,
        },
        updater,
        options_,
      ) as any
    },
    setInfiniteQueriesData(filters, updater, options_) {
      const { input, ...rest } = filters
      return options.queryClient.setQueriesData(
        {
          queryKey: getQueryKeyFromPath(options.path, {
            input,
            type: 'infinite',
          }),
          ...rest,
        },
        updater,
        options_,
      ) as any
    },

    invalidate(filters, options_) {
      const { input, queryType, ...rest } = filters ?? {}
      return options.queryClient.invalidateQueries(
        {
          queryKey: getQueryKeyFromPath(options.path, {
            input,
            type: queryType,
          }),
          ...rest,
        },
        options_,
      )
    },
    refetch(filters, options_) {
      const { input, queryType, ...rest } = filters ?? {}
      return options.queryClient.refetchQueries(
        {
          queryKey: getQueryKeyFromPath(options.path, {
            input,
            type: queryType,
          }),
          ...rest,
        },
        options_,
      )
    },
    cancel(filters, options_) {
      const { input, queryType, ...rest } = filters ?? {}
      return options.queryClient.cancelQueries(
        {
          queryKey: getQueryKeyFromPath(options.path, {
            input,
            type: queryType,
          }),
          ...rest,
        },
        options_,
      )
    },
    remove(filters) {
      const { input, queryType, ...rest } = filters ?? {}
      return options.queryClient.removeQueries({
        queryKey: getQueryKeyFromPath(options.path, {
          input,
          type: queryType,
        }),
        ...rest,
      })
    },
    reset(filters, options_) {
      const { input, queryType, ...rest } = filters ?? {}
      return options.queryClient.resetQueries(
        {
          queryKey: getQueryKeyFromPath(options.path, {
            input,
            type: queryType,
          }),
          ...rest,
        },
        options_,
      )
    },

    isFetching(filters) {
      const { input, queryType, ...rest } = filters ?? {}
      return options.queryClient.isFetching({
        queryKey: getQueryKeyFromPath(options.path, {
          input,
          type: queryType,
        }),
        ...rest,
      })
    },
    isMutating(filters) {
      return options.queryClient.isMutating({
        mutationKey: getMutationKeyFromPath(options.path),
        ...filters,
      })
    },

    getQueryDefaults(filters) {
      return options.queryClient.getQueryDefaults(
        filters?.queryKey
        ?? getQueryKeyFromPath(options.path, {
          input: filters?.input,
          type: 'query',
        }),
      )
    },
    getInfiniteQueryDefaults(filters) {
      return options.queryClient.getQueryDefaults(
        filters?.queryKey
        ?? getQueryKeyFromPath(options.path, {
          input: filters?.input,
          type: 'infinite',
        }),
      ) as any
    },

    setQueryDefaults(options_, filters) {
      return options.queryClient.setQueryDefaults(
        filters?.queryKey
        ?? getQueryKeyFromPath(options.path, {
          input: filters?.input,
          type: 'query',
        }),
        options_ as any,
      )
    },
    setInfiniteQueryDefaults(options_, filters) {
      return options.queryClient.setQueryDefaults(
        filters?.queryKey
        ?? getQueryKeyFromPath(options.path, {
          input: filters?.input,
          type: 'infinite',
        }),
        options_ as any,
      )
    },

    getMutationDefaults(filters) {
      return options.queryClient.getMutationDefaults(
        filters?.mutationKey ?? getMutationKeyFromPath(options.path),
      )
    },
    setMutationDefaults(options_, filters) {
      return options.queryClient.setMutationDefaults(
        filters?.mutationKey ?? getMutationKeyFromPath(options.path),
        options_,
      )
    },
  }
}
