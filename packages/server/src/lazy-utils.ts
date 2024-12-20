import type { Lazy } from './lazy'
import { flatLazy, lazy, unlazy } from './lazy'
import { type ANY_PROCEDURE, isProcedure } from './procedure'

export function createLazyProcedureFormAnyLazy(lazied: Lazy<any>): Lazy<ANY_PROCEDURE> {
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
