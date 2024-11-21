import { prefixHTTPPath, standardizeHTTPPath } from './utils'

it('standardizeHTTPPath', () => {
  expect(standardizeHTTPPath('/abc')).toBe('/abc')
  expect(standardizeHTTPPath('/abc/')).toBe('/abc')
  expect(standardizeHTTPPath('/abc//')).toBe('/abc')
  expect(standardizeHTTPPath('//abc//')).toBe('/abc')
})

it('prefixHTTPPath', () => {
  expect(prefixHTTPPath('/', '/abc')).toBe('/abc')
  expect(prefixHTTPPath('/', '/abc/')).toBe('/abc')
  expect(prefixHTTPPath('/', '/abc//')).toBe('/abc')
  expect(prefixHTTPPath('/', '//abc//')).toBe('/abc')
  expect(prefixHTTPPath('/abc', '/abc')).toBe('/abc/abc')
  expect(prefixHTTPPath('/abc', '/abc/')).toBe('/abc/abc')
  expect(prefixHTTPPath('/abc', '/abc//')).toBe('/abc/abc')
})
