import type { PartialDeep } from '@orpc/shared'
import type { QueryKey } from '@tanstack/query-core'
import type { OperationType } from './types'

export interface BuildKeyOptions<TType extends OperationType, TInput> {
  type?: TType
  input?: TType extends 'mutation' ? never : PartialDeep<TInput>
}

export function buildKey<TType extends OperationType, TInput>(
  path: string[],
  options: BuildKeyOptions<TType, TInput> = {},
): QueryKey {
  const withInput = options.input !== undefined ? { input: options?.input } : {}
  const withType = options.type !== undefined ? { type: options?.type } : {}

  return [path, {
    ...withInput,
    ...withType,
  }]
}
