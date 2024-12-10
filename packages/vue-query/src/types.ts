import type { ComputedRef, Ref } from 'vue'

export type MaybeRef<T> = Ref<T> | ComputedRef<T> | T

export type MaybeRefDeep<T> = MaybeRef<
  T extends object
    ? {
        [K in keyof T]: MaybeRefDeep<T[K]>
      }
    : T
>
