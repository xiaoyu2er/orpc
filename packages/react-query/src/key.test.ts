import { buildKey } from './key'

describe('buildKey', () => {
  it('works', () => {
    expect(buildKey('__ORPC__', ['path'])).toEqual(['__ORPC__', ['path'], {}])
    expect(buildKey('__ORPC__', ['path'], { type: 'query' })).toEqual(['__ORPC__', ['path'], { type: 'query' }])

    expect(buildKey('__ORPC__', ['path'], { type: 'query', input: { a: 1 } }))
      .toEqual(['__ORPC__', ['path'], { type: 'query', input: { a: 1 } }])

    expect(buildKey('__ORPC__', ['path'], { type: 'query', input: undefined }))
      .toEqual(['__ORPC__', ['path'], { type: 'query' }])

    expect(buildKey('__ORPC__', ['path'], { type: undefined, input: undefined }))
      .toEqual(['__ORPC__', ['path'], { }])
  })
})
