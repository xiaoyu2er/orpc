import type { MergePrefix, MergeRoute, MergeTags, PrefixRoute, UnshiftTagRoute } from './route'

it('MergeRoute', () => {
  expectTypeOf<MergeRoute<{ path: '/api' }, { path: '/v1' }>>().toMatchTypeOf<{ path: '/v1' }>()
  expectTypeOf<MergeRoute<{ path: '/api' }, { path: '/v1', method: 'GET' }>>().toMatchTypeOf<{ path: '/v1', method: 'GET' }>()
  expectTypeOf<MergeRoute<{ path: '/api', method: 'GET' }, { path: '/v1' }>>().toMatchTypeOf<{ path: '/v1', method: 'GET' }>()
})

it('PrefixRoute', () => {
  expectTypeOf<PrefixRoute<{ tags: ['tag'] }, '/api'>>().toMatchTypeOf<{ tags: ['tag'] }>()
  expectTypeOf<PrefixRoute<{ path: '/api' }, '/v1'>>().toMatchTypeOf<{ path: '/v1/api' }>()
  expectTypeOf<PrefixRoute<{ path: '/api', method: 'GET' }, '/v1'>>().toMatchTypeOf<{ path: '/v1/api', method: 'GET' }>()
})

it('UnshiftTagRoute', () => {
  expectTypeOf<UnshiftTagRoute<{ path: '/api' }, ['tag2']>>().toMatchTypeOf<{ path: '/api', tags: ['tag2'] }>()
  expectTypeOf<UnshiftTagRoute<{ tags: ['tag'] }, ['tag2']>>().toMatchTypeOf<{ tags: ['tag2', 'tag'] }>()
})

it('MergePrefix', () => {
  expectTypeOf<MergePrefix<undefined, '/v1'>>().toEqualTypeOf<'/v1'>()
  expectTypeOf<MergePrefix<'/api', '/v1'>>().toEqualTypeOf<'/api/v1'>()
})

it('MergeTags', () => {
  expectTypeOf<MergeTags<undefined, ['tag']>>().toEqualTypeOf<['tag']>()
  expectTypeOf<MergeTags<['tag'], ['tag2']>>().toEqualTypeOf<['tag', 'tag2']>()
  expectTypeOf<MergeTags<['tag'], ['tag', 'tag2']>>().toEqualTypeOf<['tag', 'tag', 'tag2']>()
})
