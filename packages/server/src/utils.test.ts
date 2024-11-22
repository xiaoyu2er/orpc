import { mergeContext } from './utils'

it('mergeContext', () => {
  expect(mergeContext(undefined, undefined)).toBe(undefined)
  expect(mergeContext(undefined, { foo: 'bar' })).toEqual({ foo: 'bar' })
  expect(mergeContext({ foo: 'bar' }, undefined)).toEqual({ foo: 'bar' })
  expect(mergeContext({ foo: 'bar' }, { foo: 'bar' })).toEqual({ foo: 'bar' })
  expect(mergeContext({ foo: 'bar' }, { bar: 'bar' })).toEqual({
    foo: 'bar',
    bar: 'bar',
  })
  expect(mergeContext({ foo: 'bar' }, { bar: 'bar', foo: 'bar1' })).toEqual({
    foo: 'bar1',
    bar: 'bar',
  })
})
