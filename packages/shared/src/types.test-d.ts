import type { IntersectPick, SetOptional } from './types'

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
