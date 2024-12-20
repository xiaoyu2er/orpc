import type { Promisable } from 'type-fest'

export type Value<T> = T | (() => Promisable<T>)

export function value<T extends Value<any>>(value: T): Promise<T extends Value<infer U> ? U : never> {
  if (typeof value === 'function') {
    return (value as any)()
  }

  return value as any
}
