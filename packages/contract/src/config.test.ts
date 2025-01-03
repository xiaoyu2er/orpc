import { configGlobal, fallbackToGlobalConfig } from './config'

it('configGlobal & fallbackToGlobalConfig', () => {
  configGlobal({
    defaultMethod: 'GET',
    defaultSuccessStatus: 203,
  })

  expect(fallbackToGlobalConfig('defaultMethod', undefined)).toBe('GET')
  expect(fallbackToGlobalConfig('defaultSuccessStatus', undefined)).toBe(203)

  configGlobal({ defaultMethod: undefined, defaultSuccessStatus: undefined })

  expect(fallbackToGlobalConfig('defaultMethod', undefined)).toBe('POST')
  expect(fallbackToGlobalConfig('defaultSuccessStatus', undefined)).toBe(200)

  expect(() => configGlobal({ defaultSuccessStatus: 300 })).toThrowError()

  expect(fallbackToGlobalConfig('defaultMethod', 'DELETE')).toBe('DELETE')
  expect(fallbackToGlobalConfig('defaultInputStructure', undefined)).toBe('compact')
  expect(fallbackToGlobalConfig('defaultInputStructure', 'detailed')).toBe('detailed')

  /** Reset to make sure the global config is not affected other tests */
  configGlobal({ defaultMethod: undefined, defaultSuccessStatus: undefined })
})
