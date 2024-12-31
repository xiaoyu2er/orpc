import type { EntryKey } from '@pinia/colada'
import type { BuildKeyOptions } from './key'
import type { MaybeDeepRef } from './types'
import { buildKey } from './key'
import { deepUnref } from './utils'

/**
 * Utils at any level (procedure or router)
 */
export interface GeneralUtils<TInput> {
  key: (options?: MaybeDeepRef<BuildKeyOptions<TInput>>) => EntryKey
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
