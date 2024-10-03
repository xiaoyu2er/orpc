import {
  createCallableObject,
  prefixHTTPPath,
  standardizeHTTPPath,
} from './utils'

test('standardizeHTTPPath', () => {
  expect(standardizeHTTPPath(undefined)).toBe(undefined)
  expect(standardizeHTTPPath('/abc')).toBe('/abc')
  expect(standardizeHTTPPath('/abc/')).toBe('/abc')
  expect(standardizeHTTPPath('/abc//')).toBe('/abc')
  expect(standardizeHTTPPath('//abc//')).toBe('/abc')
})

test('prefixHTTPPath', () => {
  expect(prefixHTTPPath('/abc', undefined)).toBe(undefined)
  expect(prefixHTTPPath('/', '/abc')).toBe('/abc')
  expect(prefixHTTPPath('/', '/abc/')).toBe('/abc')
  expect(prefixHTTPPath('/', '/abc//')).toBe('/abc')
  expect(prefixHTTPPath('/', '//abc//')).toBe('/abc')
  expect(prefixHTTPPath('/abc', '/abc')).toBe('/abc/abc')
  expect(prefixHTTPPath('/abc', '/abc/')).toBe('/abc/abc')
  expect(prefixHTTPPath('/abc', '/abc//')).toBe('/abc/abc')
})

test('createCallableObject', () => {
  const object = {
    a: 1,
    b: 2,
  }
  const fn = () => '1221'
  const callable = createCallableObject(object, fn)

  expect(callable()).toBe('1221')
  expect(callable.a).toBe(1)
  expect(callable.b).toBe(2)
  expect(Reflect.get(callable, 'c')).toBe(undefined)

  const clone: Record<string, any> = {}
  for (const prop in callable) {
    clone[prop] = (callable as any)[prop]
  }

  expect(clone).toEqual(object)
})
