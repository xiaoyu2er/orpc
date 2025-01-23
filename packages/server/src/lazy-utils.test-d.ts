import type { ping } from '../tests/shared'
import type { Lazy } from './lazy'
import type { FlattenLazy } from './lazy-utils'
import type { AnyProcedure } from './procedure'
import { lazy } from './lazy'
import { createLazyProcedureFormAnyLazy } from './lazy-utils'

it('createLazyProcedureFormAnyLazy return a Lazy<ANY_PROCEDURE>', async () => {
  const lazyPing = lazy(() => Promise.resolve({ default: {} as unknown }))
  const lazyProcedure = createLazyProcedureFormAnyLazy(lazyPing)
  expectTypeOf(lazyProcedure).toEqualTypeOf<Lazy<AnyProcedure>>()
})

it('FlattenLazy', () => {
  expectTypeOf<FlattenLazy<Lazy<Lazy<typeof ping>>>>().toEqualTypeOf<Lazy<typeof ping>>()
  expectTypeOf<FlattenLazy<Lazy<Lazy<Lazy<typeof ping>>>>>().toEqualTypeOf<Lazy<typeof ping>>()
})
