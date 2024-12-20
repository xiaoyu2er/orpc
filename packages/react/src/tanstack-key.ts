import type { PartialDeep } from '@orpc/shared'
import type { MutationKey, QueryKey } from '@tanstack/react-query'
import type { ProcedureHooks } from './procedure-hooks'
import type { ORPCHooks } from './react-hooks'
import { getORPCPath } from './orpc-path'

export type QueryType = 'query' | 'infinite' | undefined

export interface GetQueryKeyOptions<TInput> {
  input?: TInput
  type?: QueryType
}

export function getQueryKey<
  T extends
  | ORPCHooks<any>
  | ProcedureHooks<any, any>,
>(
  orpc: T,
  options?: GetQueryKeyOptions<
    T extends ProcedureHooks<infer UInput, any>
      ? PartialDeep<UInput>
      : unknown
  >,
): QueryKey {
  const path = getORPCPath(orpc)
  return getQueryKeyFromPath(path, options)
}

export function getQueryKeyFromPath(
  path: string[],
  options?: GetQueryKeyOptions<unknown>,
): QueryKey {
  const withInput
    = options?.input !== undefined ? { input: options?.input } : {}
  const withType = options?.type !== undefined ? { type: options?.type } : {}

  return [
    path,
    {
      ...withInput,
      ...withType,
    },
  ]
}

export function getMutationKey<
  T extends
  | ORPCHooks<any>
  | ProcedureHooks<any, any>,
>(orpc: T): MutationKey {
  const path = getORPCPath(orpc)
  return getMutationKeyFromPath(path)
}

export function getMutationKeyFromPath(path: string[]): MutationKey {
  return [path]
}
