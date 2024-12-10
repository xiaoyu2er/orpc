import type { MaybeDeepRef } from './types'
import { isRef } from 'vue'

export function deepUnref<T>(value: MaybeDeepRef<T>): T {
  if (isRef(value)) {
    return deepUnref(value.value)
  }

  if (Array.isArray(value)) {
    return value.map(deepUnref) as any
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      (acc as any)[key] = deepUnref((value as any)[key])
      return acc
    }, {} as Record<string, any>) as T
  }

  return value as any
}
