import type { EntryKey } from '@pinia/colada'
import type { ComputedRef } from 'vue'
import type { BuildKeyOptions } from './key'
import type { MaybeRefDeep } from './types'
import { computed } from 'vue'
import { buildKey } from './key'
import { unrefDeep } from './utils'

export interface GeneralUtils<TInput> {
  key(options?: MaybeRefDeep<BuildKeyOptions<TInput>>): ComputedRef<EntryKey>
}

export function createGeneralUtils<TInput>(
  path: string[],
): GeneralUtils<TInput> {
  return {
    key(options) {
      return computed(() => buildKey(path, unrefDeep(options)))
    },
  }
}
