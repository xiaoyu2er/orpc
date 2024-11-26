import type { Promisable } from 'type-fest'

export type PromisableValue<T> = T | (() => Promisable<T>)

export async function resolvePromisableValue<T extends PromisableValue<any>>(value: T):
Promise<
  Awaited<T extends (...args: any[]) => any ? ReturnType<T> : T>
> {
  if (typeof value === 'function') {
    return value()
  }

  return Promise.resolve(value) as any
}
