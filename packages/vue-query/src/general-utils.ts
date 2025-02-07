import type { QueryKey } from '@tanstack/vue-query'
import type { BuildKeyOptions, KeyType } from './key'
import type { MaybeDeepRef } from './types'
import { buildKey } from './key'
import { deepUnref } from './utils'

/**
 * Utils at any level (procedure or router)
 */
export interface GeneralUtils<TInput> {
  key<UType extends KeyType = undefined>(options?: MaybeDeepRef<BuildKeyOptions<UType, TInput>>): QueryKey
}

export function createGeneralUtils<TInput>(
  path: string[],
): GeneralUtils<TInput> {
  return {
    key(options) {
      return buildKey(path, deepUnref(options as any))
    },
  }
}
