import { clone, findDeepMatches, get, isObject, isTypescriptObject } from './object'

it('findDeepMatches', () => {
  const { maps, values } = findDeepMatches(v => typeof v === 'string', {
    array: ['v1', 'v2'],
    nested: {
      nested: [
        {
          nested: {
            v: 'v3',
          },
        },
        'v4',
      ],
    },
  })

  expect(maps).toEqual([
    ['array', 0],
    ['array', 1],
    ['nested', 'nested', 0, 'nested', 'v'],
    ['nested', 'nested', 1],
  ])

  expect(values).toEqual([
    'v1',
    'v2',
    'v3',
    'v4',
  ])
})

it('isObject', () => {
  expect(new Error('hi')).not.toSatisfy(isObject)
  expect(new Map()).not.toSatisfy(isObject)
  expect(new Set()).not.toSatisfy(isObject)
  expect(new Date()).not.toSatisfy(isObject)
  expect(false).not.toSatisfy(isObject)
  expect([]).not.toSatisfy(isObject)

  expect({}).toSatisfy(isObject)
  expect(Object.create(null)).toSatisfy(isObject)
  expect((() => {
    const obj = {}
    Object.setPrototypeOf(obj, null)
    return obj
  })()).toSatisfy(isObject)
})

it('isTypescriptObject', () => {
  expect(new Error('hi')).toSatisfy(isTypescriptObject)
  expect({}).toSatisfy(isTypescriptObject)
  expect(() => { }).toSatisfy(isTypescriptObject)
  expect(new Proxy({}, {})).toSatisfy(isTypescriptObject)

  expect(1).not.toSatisfy(isTypescriptObject)
  expect(null).not.toSatisfy(isTypescriptObject)
  expect(undefined).not.toSatisfy(isTypescriptObject)
  expect(true).not.toSatisfy(isTypescriptObject)
})

it('clone', () => {
  expect(clone(null)).toBeNull()

  const obj = { a: 1, arr: [2, 3], nested: { arr: [{ b: 4 }] } }
  const cloned = clone(obj)

  expect(cloned).toEqual(obj)
  expect(cloned).not.toBe(obj)
  expect(cloned.arr).not.toBe(obj.arr)
  expect(cloned.nested.arr).not.toBe(obj.nested.arr)
})

it('get', () => {
  expect(get({ a: { b: 1 } }, ['a', 'b'])).toEqual(1)
  expect(get({ a: { b: 1 } }, ['a', 'b', 'c'])).toEqual(undefined)
  expect(get({ a: { b: 1 } }, ['a', 'b', 'c', 'd'])).toEqual(undefined)
  expect(get({ a: { b: () => { } } }, ['a', 'b', 'name'])).toEqual('b')
  expect(get({ a: { b: () => { } } }, ['a', 'b', 'uuuu'])).toEqual(undefined)
  expect(get({ a: { b: () => { } } }, ['a', 'b', 'uuuu', 'zzzz'])).toEqual(undefined)
})
