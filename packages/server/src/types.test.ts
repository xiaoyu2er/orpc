import type { MergeContext } from './types'

it('mergeContext', () => {
  expectTypeOf<MergeContext<undefined, undefined>>().toEqualTypeOf<undefined>()
  expectTypeOf<MergeContext<undefined, { foo: string }>>().toEqualTypeOf<{
    foo: string
  }>()
  expectTypeOf<MergeContext<{ foo: string }, undefined>>().toEqualTypeOf<{
    foo: string
  }>()
  expectTypeOf<MergeContext<{ foo: string }, { foo: string }>>().toEqualTypeOf<{
    foo: string
  }>()
  expectTypeOf<MergeContext<{ foo: string }, { bar: string }>>().toMatchTypeOf<{
    foo: string
    bar: string
  }>()
})
