import type { QueryKey } from '@tanstack/react-query'

export type KeyType = 'query' | 'infinite' | 'mutation' | undefined

export interface BuildKeyOptions<TType, TInput> {
  type?: TType
  input?: TType extends 'mutation' ? never : TInput
}

export function buildKey<TType, TInput>(
  prefix: string,
  path: string[],
  options?: BuildKeyOptions<TType, TInput>,
): QueryKey {
  const withInput
        = options?.input !== undefined ? { input: options?.input } : {}
  const withType = options?.type !== undefined ? { type: options?.type } : {}

  return [
    prefix,
    path,
    {
      ...withInput,
      ...withType,
    },
  ]
}
