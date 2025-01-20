import type { Context } from './context'
import type { ANY_LAZY, FlattenLazy, Lazy } from './lazy'
import type { Procedure } from './procedure'
import { flatLazy, isLazy, lazy, unlazy } from './lazy'

const procedure = {} as Procedure<Context, Context, undefined, undefined, unknown, Record<never, never>, Record<never, never>>

const router = { procedure }

it('lazy', () => {
  expectTypeOf(
    lazy(() => Promise.resolve({ default: procedure })),
  ).toMatchTypeOf<Lazy<typeof procedure>>()

  expectTypeOf(
    lazy(() => Promise.resolve({ default: router })),
  ).toMatchTypeOf<Lazy<typeof router>>()
})

it('isLazy', () => {
  const item = {} as unknown

  if (isLazy(item)) {
    expectTypeOf(item).toEqualTypeOf<ANY_LAZY>()
  }
})

it('unwrapLazy', () => {
  expectTypeOf(
    unlazy(lazy(() => Promise.resolve({ default: procedure }))),
  ).toMatchTypeOf<Promise<{ default: typeof procedure }>>()

  expectTypeOf(
    unlazy(lazy(() => Promise.resolve({ default: router }))),
  ).toMatchTypeOf<Promise<{ default: typeof router }>>()
})

it('FlattenLazy', () => {
  expectTypeOf<FlattenLazy<Lazy<Lazy<typeof procedure>>>>().toMatchTypeOf<Lazy<typeof procedure>>()
  expectTypeOf < FlattenLazy<Lazy<Lazy<Lazy<typeof router>>>>>().toMatchTypeOf<Lazy<typeof router>>()
})

it('flatLazy', () => {
  expectTypeOf(
    flatLazy(lazy(() => Promise.resolve({ default: lazy(() => Promise.resolve({ default: procedure })) }))),
  ).toMatchTypeOf<Lazy<typeof procedure>>()

  expectTypeOf(
    flatLazy(lazy(() => Promise.resolve({ default: lazy(() => Promise.resolve({
      default: lazy(() => Promise.resolve({ default: router })),
    })) }))),
  ).toMatchTypeOf<Lazy<typeof router>>()
})
