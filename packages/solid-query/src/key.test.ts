import { buildKey } from './key'

describe('buildKey', () => {
  it('works', () => {
    expect(buildKey(['path'])).toEqual([['path'], {}])
    expect(buildKey(['path'], { type: 'query' })).toEqual([['path'], { type: 'query' }])

    expect(buildKey(['path'], { type: 'query', input: { a: 1 } }))
      .toEqual([['path'], { type: 'query', input: { a: 1 } }])

    expect(buildKey(['path'], { type: 'query', input: undefined }))
      .toEqual([['path'], { type: 'query' }])

    expect(buildKey(['path'], { type: undefined, input: undefined }))
      .toEqual([['path'], { }])
  })
})
