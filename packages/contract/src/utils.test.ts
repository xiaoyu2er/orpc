import { prefixHTTPPath, standardizeHTTPPath } from './utils'

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
