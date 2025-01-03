import { configGlobal, fallbackToGlobalConfig } from './config'

it('configGlobal & fallbackToGlobalConfig', () => {
  configGlobal({
    defaultMethod: 'GET',
  })

  expect(fallbackToGlobalConfig('defaultMethod', undefined)).toBe('GET')

  configGlobal({
    defaultMethod: undefined,
  })

  expect(fallbackToGlobalConfig('defaultMethod', undefined)).toBe('POST')

  expect(fallbackToGlobalConfig('defaultMethod', 'DELETE')).toBe('DELETE')

  expect(fallbackToGlobalConfig('defaultInputStructure', undefined)).toBe('compact')
  expect(fallbackToGlobalConfig('defaultInputStructure', 'detailed')).toBe('detailed')
})
