import type { MergedMeta, StrictMeta } from './meta'

it('StrictMeta', () => {
  expectTypeOf<StrictMeta<{ a?: string, b?: string }, { a: '1' }>>().toMatchTypeOf<{ a: '1', b?: undefined }>()
})

it('MergedMeta', () => {
  expectTypeOf<MergedMeta<{ a: '1' }, { b: '2' }>>().toMatchTypeOf<{ a: '1', b: '2' }>()
  expectTypeOf<MergedMeta<{ a: '1' }, { a: '2', b: '2' }>>().toMatchTypeOf<{ a: '2', b: '2' }>()
})
