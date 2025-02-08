import type { EntryKey } from '@pinia/colada'
import type { BuildKeyOptions } from './key'
import type { MaybeRefDeep } from './types'
import { buildKey } from './key'
import { unrefDeep } from './utils'

export interface GeneralUtils<TInput> {
  key(options?: MaybeRefDeep<BuildKeyOptions<TInput>>): EntryKey
}

export function createGeneralUtils<TInput>(
  path: string[],
): GeneralUtils<TInput> {
  return {
    key(options) {
      return buildKey(path, unrefDeep(options))
    },
  }
}
