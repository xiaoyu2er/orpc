import { buildKey } from './key'

describe('buildKey', () => {
  it('works', () => {
    expect(buildKey(['path'])).toEqual(['__ORPC__', 'path'])
    expect(buildKey(['path', 'path2'], { input: { a: 1 } }))
      .toEqual(['__ORPC__', 'path', 'path2', { input: '{"data":{"a":1},"meta":[]}' }])
    expect(buildKey(['path'], { input: undefined }))
      .toEqual(['__ORPC__', 'path'])

    const date = new Date()
    expect(buildKey(['path', 'path2'], { input: { a: date } }))
      .toEqual(['__ORPC__', 'path', 'path2', { input: `{"data":{"a":"${date.toISOString()}"},"meta":[["date",["a"]]]}` }])
  })
})
