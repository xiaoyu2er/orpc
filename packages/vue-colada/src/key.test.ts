import { buildKey } from './key'

describe('buildKey', () => {
  it('works', () => {
    expect(buildKey(['path'])).toEqual(['path'])
    expect(buildKey(['path', 'path2'], { input: { a: 1 } }))
      .toEqual(['path', 'path2', { input: '{"json":{"a":1},"meta":[]}' }])
    expect(buildKey(['path'], { input: undefined }))
      .toEqual(['path'])

    const date = new Date()
    expect(buildKey(['path', 'path2'], { input: { a: date } }))
      .toEqual(['path', 'path2', { input: `{"json":{"a":"${date.toISOString()}"},"meta":[["date",["a"]]]}` }])
  })
})
