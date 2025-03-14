import type { ContextExtendsGuard, MergedCurrentContext, MergedInitialContext } from './context'

it('MergedInitialContext', () => {
  expectTypeOf<MergedInitialContext<{ a: string }, { b: number }, { c: string }>>().toMatchTypeOf<{ a: string, b: number }>()
  expectTypeOf<MergedInitialContext<{ a: string }, { a: number }, { c: string }>>().toMatchTypeOf<{ a: never }>()
  expectTypeOf<MergedInitialContext<{ a: string }, { c: number }, { c: string }>>().toMatchTypeOf<{ a: string }>()
})

it('MergedCurrentContext', () => {
  expectTypeOf<MergedCurrentContext<{ a: string }, { b: number }>>().toMatchTypeOf<{ a: string, b: number }>()
  expectTypeOf<MergedCurrentContext<{ a: string }, { a: number }>>().toMatchTypeOf<{ a: number }>()
})

interface Empty {

}

it('ContextExtendsGuard', () => {
  expectTypeOf < ContextExtendsGuard< { a: string, b: string }, { a: string }>>().toEqualTypeOf<unknown>()
  expectTypeOf<ContextExtendsGuard<{ a: string }, { a: string }>>().toEqualTypeOf<unknown>()
  expectTypeOf < ContextExtendsGuard< { a: string, b: string }, Empty>>().toEqualTypeOf<unknown>()
  expectTypeOf < ContextExtendsGuard< { a: string, b: string }, Record<never, never>>>().toEqualTypeOf<unknown>()
  expectTypeOf < ContextExtendsGuard< { a: string, b: string }, { g?: string }>>().toEqualTypeOf<unknown>()
  expectTypeOf<ContextExtendsGuard<Empty, { a?: string }>>().toEqualTypeOf<unknown>()
  expectTypeOf<ContextExtendsGuard<{ b: string }, { a?: string }>>().toEqualTypeOf<unknown>()
  expectTypeOf<ContextExtendsGuard<{ b?: string }, { a?: string }>>().toEqualTypeOf<unknown>()

  expectTypeOf < ContextExtendsGuard < { a: string }, { a: string, b: string }>>().toEqualTypeOf<never>()
  expectTypeOf < ContextExtendsGuard < { a: number }, { a: string }>>().toEqualTypeOf<never>()
  expectTypeOf<ContextExtendsGuard<Empty, { a: string }>>().toEqualTypeOf<never>()
})
