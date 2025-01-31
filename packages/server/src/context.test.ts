import { mergeContext } from './context'

it('mergeContext', () => {
  expect(mergeContext({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
  expect(mergeContext({ a: 1 }, { a: 2 })).toEqual({ a: 2 })
})
