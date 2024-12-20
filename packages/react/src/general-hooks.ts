import type { PartialDeep, SetOptional } from '@orpc/shared'
import type { ORPCQueryFilters } from './tanstack-query'
import {
  type DefaultError,
  type Mutation,
  type MutationFilters,
  type MutationState,
  useIsFetching,
  useIsMutating,
  useMutationState,
} from '@tanstack/react-query'
import { type ORPCContext, useORPCContext } from './react-context'
import { getMutationKeyFromPath, getQueryKeyFromPath } from './tanstack-key'

export interface GeneralHooks<TInput, TOutput> {
  useIsFetching: (
    filers?: ORPCQueryFilters<PartialDeep<TInput>>,
  ) => number
  useIsMutating: (filters?: SetOptional<MutationFilters, 'mutationKey'>) => number

  useMutationState: <
    UResult = MutationState<
      TOutput,
      DefaultError,
      TInput
    >,
  >(options?: {
    filters?: SetOptional<MutationFilters, 'mutationKey'>
    select?: (
      mutation: Mutation<
        TOutput,
        DefaultError,
        TInput
      >,
    ) => UResult
  }
  ) => UResult[]
}

export interface CreateGeneralHooksOptions {
  context: ORPCContext<any>

  /**
   * The path of the router or procedure on server.
   *
   * @internal
   */
  path: string[]
}

export function createGeneralHooks<TInput, TOutput>(
  options: CreateGeneralHooksOptions,
): GeneralHooks<TInput, TOutput> {
  return {
    useIsFetching(filters) {
      const { queryType, input, ...rest } = filters ?? {}
      const context = useORPCContext(options.context)
      return useIsFetching(
        {
          queryKey: getQueryKeyFromPath(options.path, {
            input,
            type: queryType,
          }),
          ...rest,
        },
        context.queryClient,
      )
    },
    useIsMutating(filters) {
      const context = useORPCContext(options.context)
      return useIsMutating(
        { mutationKey: getMutationKeyFromPath(options.path), ...filters },
        context.queryClient,
      )
    },

    useMutationState(options_) {
      const context = useORPCContext(options.context)
      return useMutationState(
        {
          ...(options_ as any),
          filters: {
            mutationKey: getMutationKeyFromPath(options.path),
            ...options_?.filters,
          },
        },
        context.queryClient,
      )
    },
  }
}
