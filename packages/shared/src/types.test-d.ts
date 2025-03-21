import type { IntersectPick, MaybeOptionalOptions, SetOptional } from './types'

it('MaybeOptionalOptions', () => {
  const a = (...[options]: MaybeOptionalOptions<{ a: number }>) => {
    expectTypeOf(options).toEqualTypeOf<{ a: number }>()
  }

  // @ts-expect-error - options is required
  a()
  // @ts-expect-error - options is invalid
  a({ a: '1' })
  a({ a: 1 })

  const b = (...[options]: MaybeOptionalOptions<{ b?: number }>) => {
    expectTypeOf(options).toEqualTypeOf<{ b?: number } | undefined>()
  }

  b()
  // @ts-expect-error - options is invalid
  b({ b: '1' })
  b({ b: 1 })
})

it('SetOptional', () => {
  expectTypeOf<SetOptional<{ a: number }, 'a'>>().toMatchTypeOf<{ a?: number }>()
  expectTypeOf<SetOptional<{ a?: number }, 'a'>>().toMatchTypeOf<{ a?: number }>()
})

interface Empty {}

it('IntersectPick', () => {
  expectTypeOf<IntersectPick<{ a: number }, { a: number, b: number }>>().toEqualTypeOf<{ a: number }>()
  expectTypeOf<IntersectPick<{ a: number, b: number }, { b: number }>>().toEqualTypeOf<{ b: number }>()
  expectTypeOf<IntersectPick<{ a: number }, { b: number }>>().toEqualTypeOf<Empty>()
})
