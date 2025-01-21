import type { AdaptedRoute, MergedPrefix, MergedRoute, MergedTags, PrefixedRoute, StrictRoute, UnshiftedTagRoute } from './route'

it('StrictRoute', () => {
  expectTypeOf<StrictRoute<{ path: '/api' }>>().toMatchTypeOf<{ path: '/api', method?: undefined }>()
  expectTypeOf<StrictRoute<{ path: '/api', method: 'GET' }>>().toMatchTypeOf<{ path: '/api', method: 'GET', description?: undefined, summary?: undefined, deprecated?: undefined, tags?: undefined, successStatus?: undefined, successDescription?: undefined, inputStructure?: undefined, outputStructure?: undefined }>()
})

it('MergedRoute', () => {
  expectTypeOf<MergedRoute<{ path: '/api' }, { path: '/v1' }>>().toMatchTypeOf<{ path: '/v1' }>()
  expectTypeOf<MergedRoute<{ path: '/api' }, { path: '/v1', method: 'GET' }>>().toMatchTypeOf<{ path: '/v1', method: 'GET' }>()
  expectTypeOf<MergedRoute<{ path: '/api', method: 'GET' }, { path: '/v1' }>>().toMatchTypeOf<{ path: '/v1', method: 'GET' }>()
})

it('PrefixedRoute', () => {
  expectTypeOf<PrefixedRoute<{ tags: ['tag'] }, '/api'>>().toMatchTypeOf<{ tags: ['tag'] }>()
  expectTypeOf<PrefixedRoute<{ path: '/api' }, '/v1'>>().toMatchTypeOf<{ path: '/v1/api' }>()
  expectTypeOf<PrefixedRoute<{ path: '/api', method: 'GET' }, '/v1'>>().toMatchTypeOf<{ path: '/v1/api', method: 'GET' }>()
})

it('UnshiftedTagRoute', () => {
  expectTypeOf<UnshiftedTagRoute<{ path: '/api' }, ['tag2']>>().toMatchTypeOf<{ path: '/api', tags: ['tag2'] }>()
  expectTypeOf<UnshiftedTagRoute<{ tags: ['tag'] }, ['tag2']>>().toMatchTypeOf<{ tags: ['tag2', 'tag'] }>()
})

it('MergedPrefix', () => {
  expectTypeOf<MergedPrefix<undefined, '/v1'>>().toEqualTypeOf<'/v1'>()
  expectTypeOf<MergedPrefix<'/api', '/v1'>>().toEqualTypeOf<'/api/v1'>()
})

it('MergedTags', () => {
  expectTypeOf<MergedTags<undefined, ['tag']>>().toEqualTypeOf<['tag']>()
  expectTypeOf<MergedTags<['tag'], ['tag2']>>().toEqualTypeOf<['tag', 'tag2']>()
  expectTypeOf<MergedTags<['tag'], ['tag', 'tag2']>>().toEqualTypeOf<['tag', 'tag', 'tag2']>()
})

it('AdaptedRoute', () => {
  expectTypeOf<AdaptedRoute<{ path: '/api' }, '/v1', undefined>>().toMatchTypeOf<{ path: '/v1/api' }>()
  expectTypeOf<AdaptedRoute<{ method: 'GET' }, '/v1', undefined>>().toMatchTypeOf<{ path?: undefined, method: 'GET' }>()

  expectTypeOf<AdaptedRoute<{ path: '/api' }, undefined, ['tag']>>().toMatchTypeOf<{ path: '/api', tags: ['tag'] }>()
  expectTypeOf<AdaptedRoute<{ path: '/api', tags: ['e'] }, undefined, ['tag']>>().toMatchTypeOf<{ path: '/api', tags: ['tag', 'e'] }>()

  expectTypeOf<AdaptedRoute<{ path: '/api', tags: ['tag'] }, '/v1', ['tag2']>>().toMatchTypeOf<{ path: '/v1/api', tags: ['tag2', 'tag'] }>()
})
