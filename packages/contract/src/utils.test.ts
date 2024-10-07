import { prefixHTTPPath, standardizeHTTPPath } from './utils'

test('standardizeHTTPPath', () => {
  expect(standardizeHTTPPath('/abc')).toBe('/abc')
  expect(standardizeHTTPPath('/abc/')).toBe('/abc')
  expect(standardizeHTTPPath('/abc//')).toBe('/abc')
  expect(standardizeHTTPPath('//abc//')).toBe('/abc')
})

test('prefixHTTPPath', () => {
  expect(prefixHTTPPath('/', '/abc')).toBe('/abc')
  expect(prefixHTTPPath('/', '/abc/')).toBe('/abc')
  expect(prefixHTTPPath('/', '/abc//')).toBe('/abc')
  expect(prefixHTTPPath('/', '//abc//')).toBe('/abc')
  expect(prefixHTTPPath('/abc', '/abc')).toBe('/abc/abc')
  expect(prefixHTTPPath('/abc', '/abc/')).toBe('/abc/abc')
  expect(prefixHTTPPath('/abc', '/abc//')).toBe('/abc/abc')
})
