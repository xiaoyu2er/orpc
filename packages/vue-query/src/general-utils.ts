import type { QueryKey } from '@tanstack/vue-query'
import type { BuildKeyOptions, KeyType } from './key'
import type { MaybeRefDeep } from './types'
import { computed, type ComputedRef } from 'vue'
import { buildKey } from './key'
import { unrefDeep } from './utils'

export interface GeneralUtils<TInput> {
  key<UType extends KeyType = undefined>(options?: MaybeRefDeep<BuildKeyOptions<UType, TInput>>): ComputedRef<QueryKey>
}

export function createGeneralUtils<TInput>(
  path: string[],
): GeneralUtils<TInput> {
  return {
    key(options) {
      return computed(() => buildKey(path, unrefDeep(options as any)))
    },
  }
}
