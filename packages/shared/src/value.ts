import type { Promisable } from 'type-fest'

export type Value<T, TArgs extends any[] = []> = T | ((...args: TArgs) => Promisable<T>)

export function value<T extends Value<any, TArgs>, TArgs extends any[] = []>(value: T, ...args: TArgs): Promise<T extends Value<infer U, any> ? U : never> {
  if (typeof value === 'function') {
    return (value as any)(...args)
  }

  return value as any
}
