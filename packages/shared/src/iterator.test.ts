import { isAsyncIteratorObject } from './iterator'

it('isAsyncIteratorObject', () => {
  expect(isAsyncIteratorObject(null)).toBe(false)
  expect(isAsyncIteratorObject({})).toBe(false)
  expect(isAsyncIteratorObject(() => {})).toBe(false)
  expect(isAsyncIteratorObject({ [Symbol.asyncIterator]: 123 })).toBe(false)

  expect(isAsyncIteratorObject({ [Symbol.asyncIterator]: () => { } })).toBe(true)

  async function* gen() { }
  expect(isAsyncIteratorObject(gen())).toBe(true)

  function* gen2() { }
  expect(isAsyncIteratorObject(gen2())).toBe(false)
})
