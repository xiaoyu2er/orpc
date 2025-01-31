import type { Lazy } from './lazy'
import { isLazy, lazy, unlazy } from './lazy'
import { type AnyProcedure, isProcedure } from './procedure'

export type FlattenLazy<T> = T extends Lazy<infer U>
  ? FlattenLazy<U>
  : Lazy<T>

export function flatLazy<T extends Lazy<any>>(lazied: T): FlattenLazy<T> {
  const flattenLoader = async () => {
    let current = await unlazy(lazied)

    while (true) {
      if (!isLazy(current.default)) {
        break
      }

      current = await unlazy(current.default)
    }

    return current
  }

  return lazy(flattenLoader) as any
}

export function createLazyProcedureFormAnyLazy(lazied: Lazy<any>): Lazy<AnyProcedure> {
  const lazyProcedure = lazy(async () => {
    const { default: maybeProcedure } = await unlazy(flatLazy(lazied))

    if (!isProcedure(maybeProcedure)) {
      throw new Error(`
            Expected a lazy<procedure> but got lazy<unknown>.
            This should be caught by TypeScript compilation.
            Please report this issue if this makes you feel uncomfortable.
        `)
    }

    return { default: maybeProcedure }
  })

  return lazyProcedure
}
