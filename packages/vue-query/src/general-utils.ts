import type { QueryKey } from '@tanstack/vue-query'
import type { BuildKeyOptions, KeyType } from './key'
import type { MaybeRefDeep } from './types'
import { buildKey } from './key'
import { unrefDeep } from './utils'

export interface GeneralUtils<TInput> {
  key<UType extends KeyType = undefined>(options?: MaybeRefDeep<BuildKeyOptions<UType, TInput>>): QueryKey
}

export function createGeneralUtils<TInput>(
  path: string[],
): GeneralUtils<TInput> {
  return {
    key(options) {
      return buildKey(path, unrefDeep(options as any))
    },
  }
}
