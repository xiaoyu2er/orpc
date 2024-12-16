import type { AnyFunction } from '@orpc/shared'
import type { Ref } from 'vue'
import { isRef } from 'vue'

export type DeepUnref<T> = T extends Ref<infer U>
  ? DeepUnref<U>
  : T extends AnyFunction ? T
    : T extends object ? { [K in keyof T]: DeepUnref<T[K]> }
      : T

export function deepUnref<T>(value: T): DeepUnref<T> {
  if (isRef(value)) {
    return deepUnref(value.value) as any
  }

  if (Array.isArray(value)) {
    return value.map(deepUnref) as any
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      (acc as any)[key] = deepUnref((value as any)[key])
      return acc
    }, {} as Record<string, any>) as any
  }

  return value as any
}
