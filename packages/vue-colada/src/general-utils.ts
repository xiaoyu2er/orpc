import type { EntryKey } from '@pinia/colada'
import type { BuildKeyOptions } from './key'
import { buildKey } from './key'

export interface GeneralUtils<TInput> {
  key(options?: BuildKeyOptions<TInput>): EntryKey
}

export function createGeneralUtils<TInput>(
  path: string[],
): GeneralUtils<TInput> {
  return {
    key(options) {
      return buildKey(path, options)
    },
  }
}
