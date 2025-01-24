import type { ConflictContextGuard, MergedContext } from './context'

it('MergedContext', () => {
  expectTypeOf<MergedContext<{ a: string }, { b: number }>>().toMatchTypeOf<{ a: string, b: number }>()
  expectTypeOf<MergedContext<{ a: string }, { a: number }>>().toMatchTypeOf<{ a: never }>()
})

it('ConflictContextGuard', () => {
  expectTypeOf<ConflictContextGuard<MergedContext<{ a: string }, { b: number }>>>().toEqualTypeOf<unknown>()
  expectTypeOf<ConflictContextGuard<MergedContext<{ a: string }, { a: number }>>>().toEqualTypeOf<never>()
  expectTypeOf<ConflictContextGuard<never>>().toEqualTypeOf<never>()
})
