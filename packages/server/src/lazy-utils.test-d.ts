import type { Lazy } from './lazy'
import type { ANY_PROCEDURE } from './procedure'
import { lazy } from './lazy'
import { createLazyProcedureFormAnyLazy } from './lazy-utils'

it('createLazyProcedureFormAnyLazy return a Lazy<ANY_PROCEDURE>', async () => {
  const lazyPing = lazy(() => Promise.resolve({ default: {} as unknown }))
  const lazyProcedure = createLazyProcedureFormAnyLazy(lazyPing)
  expectTypeOf(lazyProcedure).toEqualTypeOf<Lazy<ANY_PROCEDURE>>()
})
