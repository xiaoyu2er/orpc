import { configGlobal, fallbackToGlobalConfig } from './config'

it('configGlobal & fallbackToGlobalConfig', () => {
  configGlobal({
    defaultMethod: 'GET',
  })

  configGlobal({
    // @ts-expect-error -- invalid value
    defaultMethod: 'INVALID',
  })

  fallbackToGlobalConfig('defaultMethod', undefined)
  fallbackToGlobalConfig('defaultMethod', 'GET')
  // @ts-expect-error -- invalid value
  fallbackToGlobalConfig('defaultMethod', 'INVALID')
  // @ts-expect-error -- invalid global config
  fallbackToGlobalConfig('INVALID', 'GET')
})
