import type { MergedMeta } from './meta'

it('MergedMeta', () => {
  expectTypeOf<MergedMeta<{ a: '1' }, { b: '2' }>>().toMatchTypeOf<{ a: '1', b: '2' }>()
  expectTypeOf<MergedMeta<{ a: '1' }, { a: '2', b: '2' }>>().toMatchTypeOf<{ a: '2', b: '2' }>()
})
