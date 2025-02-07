import type { PartialDeep as Key } from '@orpc/shared'
import type { QueryKey } from '@tanstack/react-query'

export type KeyType = 'query' | 'infinite' | 'mutation' | undefined

export interface BuildKeyOptions<TType extends KeyType, TInput> {
  type?: TType
  input?: TType extends 'mutation' ? never : Key<TInput>
}

export function buildKey<TType extends KeyType, TInput>(
  path: string[],
  options?: BuildKeyOptions<TType, TInput>,
): QueryKey {
  const withInput = options?.input !== undefined ? { input: options?.input } : {}
  const withType = options?.type !== undefined ? { type: options?.type } : {}

  return [path, {
    ...withInput,
    ...withType,
  }]
}
